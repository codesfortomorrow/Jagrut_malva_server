import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  HierarchyLevel,
  HierarchyStatus,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHierarchyNodeDto } from './dto/create-hierarchy-node.dto';
import { UpdateHierarchyNodeDto } from './dto/update-hierarchy-node.dto';
import { GetHierarchyNodesDto } from './dto/get-hierarchy-nodes.dto';

const LEVEL_ORDER: HierarchyLevel[] = [
  HierarchyLevel.Prant,
  HierarchyLevel.Vibhag,
  HierarchyLevel.Jila,
  HierarchyLevel.Khand,
  HierarchyLevel.Mandal,
  HierarchyLevel.Gram,
];

/** Each level's required parent level — Prant has no entry (root) */
const REQUIRED_PARENT_LEVEL: Partial<Record<HierarchyLevel, HierarchyLevel>> = {
  [HierarchyLevel.Vibhag]: HierarchyLevel.Prant,
  [HierarchyLevel.Jila]: HierarchyLevel.Vibhag,
  [HierarchyLevel.Khand]: HierarchyLevel.Jila,
  [HierarchyLevel.Mandal]: HierarchyLevel.Khand,
  [HierarchyLevel.Gram]: HierarchyLevel.Mandal,
};

@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException(`Hierarchy node with id ${id} not found`);
    }

    return node;
  }

  /**
   * Exports the entire Geo Hierarchy as an RFC-4180 compliant CSV string.
   * Traversal is Pre-order DFS so each parent's children appear directly beneath it.
   * Format: Node_ID, Node_Name, Level, Status, Parent_ID, Parent_Name, Hierarchy_Path, Description
   */
  async exportHierarchyCsv(): Promise<string> {
    const headers = [
      'Node_ID',
      'Node_Name',
      'Level',
      'Status',
      'Parent_ID',
      'Parent_Name',
      'Hierarchy_Path',
      'Description',
    ];

    const nodes = await this.prisma.hierarchyNode.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        status: true,
        parentId: true,
        description: true,
      },
      orderBy: { id: 'asc' },
    });

    // Handle empty data case: return headers only
    if (!nodes || nodes.length === 0) {
      return stringify([], {
        header: true,
        columns: headers,
        record_delimiter: 'windows',
      });
    }

    // 1. Build in-memory lookup maps for O(N) performance
    const nodesById = new Map<number, (typeof nodes)[number]>();
    const childrenByParentId = new Map<
      number | null,
      (typeof nodes)[number][]
    >();

    for (const node of nodes) {
      nodesById.set(node.id, node);
      const pId = node.parentId ?? null;
      let children = childrenByParentId.get(pId);
      if (!children) {
        children = [];
        childrenByParentId.set(pId, children);
      }
      children.push(node);
    }

    const rows: (string | number)[][] = [];
    const visitedIds = new Set<number>();

    // 2. Pre-order DFS traversal (parent followed immediately by its children)
    const traverse = (parentId: number | null, pathSegments: string[]) => {
      const children = childrenByParentId.get(parentId) || [];
      for (const child of children) {
        visitedIds.add(child.id);
        const parentNode =
          child.parentId != null ? nodesById.get(child.parentId) : null;
        const currentPath = [...pathSegments, child.name];
        const hierarchyPath = currentPath.join(' > ');

        rows.push([
          child.id,
          child.name,
          child.level,
          child.status,
          child.parentId ?? '',
          parentNode?.name ?? '',
          hierarchyPath,
          child.description ?? '',
        ]);

        // Recurse for downstream children
        traverse(child.id, currentPath);
      }
    };

    // Start DFS from root nodes (parentId = null)
    traverse(null, []);

    // 3. Fallback: If any disconnected/orphan nodes exist, append them at the end
    if (visitedIds.size < nodes.length) {
      for (const node of nodes) {
        if (!visitedIds.has(node.id)) {
          const parentNode =
            node.parentId != null ? nodesById.get(node.parentId) : null;
          rows.push([
            node.id,
            node.name,
            node.level,
            node.status,
            node.parentId ?? '',
            parentNode?.name ?? '',
            node.name,
            node.description ?? '',
          ]);
        }
      }
    }

    return stringify(rows, {
      header: true,
      columns: headers,
      record_delimiter: 'windows',
    });
  }

  /**
   * Imports the complete Geo Hierarchy from a CSV file in a single atomic operation.
   * Phase 1: In-memory parsing, structural and parent-child validation (zero DB writes).
   * Phase 2: Topologically sorted level-by-level insertion within a Prisma transaction.
   */
  async importHierarchyCsv(fileBuffer: Buffer) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('CSV file is empty.');
    }

    // 1. Parse CSV with csv-parse
    let rawRecords: Record<string, string>[];
    try {
      rawRecords = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      throw new BadRequestException(
        `Failed to parse CSV file: ${parseError.message || 'Invalid CSV format'}`,
      );
    }

    if (!rawRecords || rawRecords.length === 0) {
      throw new BadRequestException('CSV file contains no data rows.');
    }

    if (rawRecords.length > 50000) {
      throw new BadRequestException(
        `CSV exceeds maximum allowed limit of 50,000 rows. Found: ${rawRecords.length} rows.`,
      );
    }

    // 2. Fetch existing nodes in a SINGLE DB query to avoid N+1
    const existingNodes = await this.prisma.hierarchyNode.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        status: true,
        parentId: true,
        description: true,
      },
      orderBy: { id: 'asc' },
    });

    // In-memory lookup maps for existing nodes (mirroring exportHierarchyCsv)
    const existingNodesById = new Map<number, (typeof existingNodes)[number]>();
    const existingNodesByLevelAndName = new Map<
      string,
      (typeof existingNodes)[number][]
    >();
    const existingChildrenByParentId = new Map<
      number | null,
      (typeof existingNodes)[number][]
    >();
    for (const node of existingNodes) {
      existingNodesById.set(node.id, node);
      const levelNameKey = `${node.level}___${node.name.toLowerCase()}`;
      let byLevelName = existingNodesByLevelAndName.get(levelNameKey);
      if (!byLevelName) {
        byLevelName = [];
        existingNodesByLevelAndName.set(levelNameKey, byLevelName);
      }
      byLevelName.push(node);

      const pId = node.parentId ?? null;
      let children = existingChildrenByParentId.get(pId);
      if (!children) {
        children = [];
        existingChildrenByParentId.set(pId, children);
      }
      children.push(node);
    }

    // Build existing hierarchy paths map
    const existingPathToNode = new Map<
      string,
      (typeof existingNodes)[number]
    >();
    const existingNodeIdToPath = new Map<number, string>();
    const buildExistingPaths = (
      parentId: number | null,
      pathSegments: string[],
    ) => {
      const children = existingChildrenByParentId.get(parentId) || [];
      for (const child of children) {
        const currentPath = [...pathSegments, child.name.trim()];
        const fullPath = currentPath.join(' > ');
        existingPathToNode.set(fullPath.toLowerCase(), child);
        existingNodeIdToPath.set(child.id, fullPath);
        buildExistingPaths(child.id, currentPath);
      }
    };
    buildExistingPaths(null, []);

    // 3. Phase 1 — Parse, Normalize and Validate Rows
    interface NormalizedRow {
      rowNumber: number;
      name: string;
      level: HierarchyLevel;
      status: HierarchyStatus;
      parentName?: string;
      parentId?: number;
      hierarchyPath?: string;
      description?: string;
      computedPath: string;
      parentComputedPath?: string;
    }

    const errors: { row: number; node: string; error: string }[] = [];
    const validLevelSet = new Set<string>(LEVEL_ORDER);

    const csvNodesByPath = new Map<string, NormalizedRow>();
    const csvNodesByLevelAndName = new Map<string, NormalizedRow[]>();
    const csvNodesByParentAndName = new Set<string>();

    const normalizedRows: NormalizedRow[] = [];

    for (let i = 0; i < rawRecords.length; i++) {
      const row = rawRecords[i];
      const rowNumber = i + 2; // +1 for 0-indexed, +1 for header line

      const name = (
        row['Node_Name'] ||
        row['Name'] ||
        row['node_name'] ||
        row['name'] ||
        ''
      ).trim();
      const rawLevel = (row['Level'] || row['level'] || '').trim();
      const rawStatus = (row['Status'] || row['status'] || 'Active').trim();
      const parentName =
        (row['Parent_Name'] || row['parent_name'] || '').trim() || undefined;
      const rawParentId = (row['Parent_ID'] || row['parent_id'] || '').trim();
      const parentId =
        rawParentId && !isNaN(Number(rawParentId))
          ? Number(rawParentId)
          : undefined;
      const hierarchyPath =
        (row['Hierarchy_Path'] || row['hierarchy_path'] || '').trim() ||
        undefined;
      const description = (
        row['Description'] ||
        row['description'] ||
        ''
      ).trim();

      if (!name) {
        errors.push({
          row: rowNumber,
          node: 'N/A',
          error: 'Node Name is required and cannot be empty.',
        });
        continue;
      }

      if (!rawLevel || !validLevelSet.has(rawLevel)) {
        errors.push({
          row: rowNumber,
          node: name,
          error: `Invalid level '${rawLevel}'. Allowed levels: ${LEVEL_ORDER.join(', ')}.`,
        });
        continue;
      }

      const level = rawLevel as HierarchyLevel;

      let status: HierarchyStatus = HierarchyStatus.Active;
      if (
        rawStatus &&
        (rawStatus.toLowerCase() === 'inactive' ||
          rawStatus.toLowerCase() === 'blocked')
      ) {
        status = HierarchyStatus.InActive;
      }

      let computedPath = '';
      let parentComputedPath: string | undefined = undefined;

      if (level === HierarchyLevel.Prant) {
        computedPath = name;
      } else {
        if (hierarchyPath) {
          computedPath = hierarchyPath;
          const parts = hierarchyPath.split('>').map((p) => p.trim());
          if (parts.length > 1) {
            parentComputedPath = parts.slice(0, -1).join(' > ');
          }
        } else if (parentName) {
          parentComputedPath = parentName;
          computedPath = `${parentName} > ${name}`;
        }
      }

      normalizedRows.push({
        rowNumber,
        name,
        level,
        status,
        parentName,
        parentId,
        hierarchyPath,
        description,
        computedPath,
        parentComputedPath,
      });
    }

    // Check for root Prant constraints
    const prantRows = normalizedRows.filter(
      (r) => r.level === HierarchyLevel.Prant,
    );
    const existingPrants = existingNodes.filter(
      (n) => n.level === HierarchyLevel.Prant,
    );

    if (existingPrants.length === 0 && prantRows.length === 0) {
      errors.push({
        row: 1,
        node: 'Root',
        error:
          'CSV must include a root "Prant" node when no Prant currently exists in the system.',
      });
    } else if (prantRows.length > 1) {
      errors.push({
        row: prantRows[1].rowNumber,
        node: prantRows[1].name,
        error:
          'Only one Prant (root) node is allowed. Found multiple Prant records in CSV.',
      });
    } else if (existingPrants.length > 0 && prantRows.length > 0) {
      if (
        prantRows[0].name.toLowerCase() !== existingPrants[0].name.toLowerCase()
      ) {
        errors.push({
          row: prantRows[0].rowNumber,
          node: prantRows[0].name,
          error: `Root Prant '${existingPrants[0].name}' already exists in database. CSV root Prant '${prantRows[0].name}' cannot create a second root.`,
        });
      }
    }

    // Populate lookup maps for CSV rows to resolve parent references
    for (const row of normalizedRows) {
      csvNodesByPath.set(row.computedPath.toLowerCase(), row);
      const levelNameKey = `${row.level}___${row.name.toLowerCase()}`;
      let list = csvNodesByLevelAndName.get(levelNameKey);
      if (!list) {
        list = [];
        csvNodesByLevelAndName.set(levelNameKey, list);
      }
      list.push(row);
    }

    // Validate relationships and hierarchy sequence
    for (const row of normalizedRows) {
      const requiredParentLevel = REQUIRED_PARENT_LEVEL[row.level];

      if (!requiredParentLevel) {
        if (row.parentName || row.parentId) {
          errors.push({
            row: row.rowNumber,
            node: row.name,
            error: 'Prant is the root level and cannot have a parent node.',
          });
        }
      } else {
        if (!row.parentName && !row.parentId && !row.parentComputedPath) {
          errors.push({
            row: row.rowNumber,
            node: row.name,
            error: `Level '${row.level}' requires a parent of level '${requiredParentLevel}'.`,
          });
          continue;
        }

        let parentNode: { level: HierarchyLevel; name: string } | undefined =
          undefined;

        // 1. By computed path
        if (row.parentComputedPath) {
          const fromCsv = csvNodesByPath.get(
            row.parentComputedPath.toLowerCase(),
          );
          if (fromCsv) {
            parentNode = fromCsv;
          } else {
            const fromDb = existingPathToNode.get(
              row.parentComputedPath.toLowerCase(),
            );
            if (fromDb) parentNode = fromDb;
          }
        }

        // 2. By parentName if not resolved by path (with ambiguity check)
        if (!parentNode && row.parentName) {
          const lookupKey = `${requiredParentLevel}___${row.parentName.toLowerCase()}`;
          const csvMatches = csvNodesByLevelAndName.get(lookupKey) || [];
          const dbMatches = existingNodesByLevelAndName.get(lookupKey) || [];

          // Unify matches by distinct computed path
          const candidateMap = new Map<
            string,
            {
              level: HierarchyLevel;
              name: string;
              computedPath: string;
              id?: number;
            }
          >();

          for (const m of dbMatches) {
            const path = existingNodeIdToPath.get(m.id) || m.name;
            candidateMap.set(path.toLowerCase(), {
              level: m.level,
              name: m.name,
              computedPath: path,
              id: m.id,
            });
          }

          for (const m of csvMatches) {
            candidateMap.set(m.computedPath.toLowerCase(), {
              level: m.level,
              name: m.name,
              computedPath: m.computedPath,
            });
          }

          const candidates = Array.from(candidateMap.values());

          if (candidates.length > 1) {
            errors.push({
              row: row.rowNumber,
              node: row.name,
              error: `Multiple nodes named '${row.parentName}' found at level '${requiredParentLevel}' (${candidates.map((c) => `'${c.computedPath}'`).join(', ')}). Please use 'Hierarchy_Path' or specify Parent_ID to disambiguate.`,
            });
            continue;
          } else if (candidates.length === 1) {
            const singleMatch = candidates[0];
            parentNode = singleMatch;
            row.parentComputedPath = singleMatch.computedPath;
            row.computedPath = `${singleMatch.computedPath} > ${row.name}`;
            if (singleMatch.id) {
              row.parentId = singleMatch.id;
            }
            csvNodesByPath.set(row.computedPath.toLowerCase(), row);
          }
        }

        // 3. By parentId if not resolved
        if (!parentNode && row.parentId) {
          const fromDb = existingNodesById.get(row.parentId);
          if (fromDb) parentNode = fromDb;
        }

        if (!parentNode) {
          errors.push({
            row: row.rowNumber,
            node: row.name,
            error: `Parent node '${row.parentName || row.parentComputedPath || row.parentId}' not found in CSV or database.`,
          });
          continue;
        }

        // Validate parent level matches REQUIRED_PARENT_LEVEL
        if (parentNode.level !== requiredParentLevel) {
          errors.push({
            row: row.rowNumber,
            node: row.name,
            error: `Invalid parent for level '${row.level}'. Expected parent level: '${requiredParentLevel}', but parent '${parentNode.name}' is '${parentNode.level}'.`,
          });
        }

        // Duplicate check within CSV under the same parent
        const parentKey =
          row.parentComputedPath?.toLowerCase() ||
          row.parentName?.toLowerCase() ||
          String(row.parentId);
        const dupKey = `${parentKey}___${row.name.toLowerCase()}`;
        if (csvNodesByParentAndName.has(dupKey)) {
          errors.push({
            row: row.rowNumber,
            node: row.name,
            error: `Duplicate node name '${row.name}' under the same parent '${row.parentName || row.parentComputedPath}' in CSV.`,
          });
        } else {
          csvNodesByParentAndName.add(dupKey);
        }
      }
    }

    // Fail-fast: If any validation errors exist, abort immediately
    if (errors.length > 0) {
      throw new BadRequestException({
        status: 'error',
        message: `CSV validation failed with ${errors.length} error(s). No records were imported.`,
        errorCount: errors.length,
        errors,
      });
    }

    // 4. Phase 2 — Topological Level-by-Level Ingestion inside Prisma Transaction
    const breakdown: Record<string, number> = {
      [HierarchyLevel.Prant]: 0,
      [HierarchyLevel.Vibhag]: 0,
      [HierarchyLevel.Jila]: 0,
      [HierarchyLevel.Khand]: 0,
      [HierarchyLevel.Mandal]: 0,
      [HierarchyLevel.Gram]: 0,
    };

    let importedRecords = 0;
    let skippedRecords = 0;

    // Group normalized rows by tier
    const tierBuckets = new Map<HierarchyLevel, NormalizedRow[]>();
    for (const level of LEVEL_ORDER) {
      tierBuckets.set(level, []);
    }
    for (const row of normalizedRows) {
      tierBuckets.get(row.level)!.push(row);
    }

    await this.prisma.$transaction(
      async (tx) => {
        const pathToId = new Map<string, number>();
        const nameAndParentToId = new Map<string, number>();
        const uniqueNameToId = new Map<string, number | 'AMBIGUOUS'>();

        // Preload existing DB nodes
        for (const [path, node] of existingPathToNode.entries()) {
          pathToId.set(path, node.id);
          nameAndParentToId.set(
            `${node.parentId ?? 'root'}___${node.name.toLowerCase()}`,
            node.id,
          );
          const nameKey = `${node.level}___${node.name.toLowerCase()}`;
          if (uniqueNameToId.has(nameKey)) {
            uniqueNameToId.set(nameKey, 'AMBIGUOUS');
          } else {
            uniqueNameToId.set(nameKey, node.id);
          }
        }

        for (const level of LEVEL_ORDER) {
          const rowsInTier = tierBuckets.get(level) || [];
          if (rowsInTier.length === 0) continue;

          const toInsertRows: {
            row: NormalizedRow;
            parentId: number | null;
            existsKey: string;
          }[] = [];

          for (const row of rowsInTier) {
            let parentId: number | null = null;

            if (row.level !== HierarchyLevel.Prant) {
              // 1. Full computed path lookup (guaranteed unique)
              if (
                row.parentComputedPath &&
                pathToId.has(row.parentComputedPath.toLowerCase())
              ) {
                parentId = pathToId.get(row.parentComputedPath.toLowerCase())!;
              } else if (row.parentId) {
                parentId = row.parentId;
              } else if (row.parentName) {
                const parentLevel = REQUIRED_PARENT_LEVEL[row.level];
                const nameKey = `${parentLevel}___${row.parentName.toLowerCase()}`;
                const resolvedId = uniqueNameToId.get(nameKey);

                if (resolvedId === 'AMBIGUOUS') {
                  throw new BadRequestException({
                    status: 'error',
                    message: `Multiple nodes named '${row.parentName}' found at level '${parentLevel}'. Please use 'Hierarchy_Path' to disambiguate.`,
                  });
                } else if (typeof resolvedId === 'number') {
                  parentId = resolvedId;
                }
              }
            }

            // Check if node already exists in DB under this specific parent
            const existsKey = `${parentId ?? 'root'}___${row.name.toLowerCase()}`;
            const existingId = nameAndParentToId.get(existsKey);

            if (existingId) {
              // Attach/skip without recreation
              pathToId.set(row.computedPath.toLowerCase(), existingId);
              skippedRecords++;
            } else {
              toInsertRows.push({ row, parentId, existsKey });
            }
          }

          // Batch insert newly added nodes for this tier in chunks of 1000
          if (toInsertRows.length > 0) {
            const CHUNK_SIZE = 1000;
            for (let c = 0; c < toInsertRows.length; c += CHUNK_SIZE) {
              const chunk = toInsertRows.slice(c, c + CHUNK_SIZE);
              await tx.hierarchyNode.createMany({
                data: chunk.map(({ row, parentId }) => ({
                  name: row.name,
                  level: row.level,
                  status: row.status,
                  description: row.description || '',
                  parentId: parentId,
                })),
              });
            }

            // Fetch newly-inserted nodes' generated IDs for this tier
            const insertedParentIds = Array.from(
              new Set(toInsertRows.map((item) => item.parentId)),
            );
            const hasNullParent = insertedParentIds.some((id) => id === null);
            const validParentIds = insertedParentIds.filter(
              (id): id is number => typeof id === 'number',
            );

            const orConditions: any[] = [];
            if (validParentIds.length > 0) {
              orConditions.push({ parentId: { in: validParentIds } });
            }
            if (hasNullParent) {
              orConditions.push({ parentId: null });
            }

            const tierNodes = await tx.hierarchyNode.findMany({
              where: {
                level: level,
                OR: orConditions,
              },
              select: { id: true, name: true, parentId: true, level: true },
            });

            for (const node of tierNodes) {
              const key = `${node.parentId ?? 'root'}___${node.name.toLowerCase()}`;
              nameAndParentToId.set(key, node.id);

              const nameKey = `${node.level}___${node.name.toLowerCase()}`;
              if (uniqueNameToId.has(nameKey)) {
                if (uniqueNameToId.get(nameKey) !== node.id) {
                  uniqueNameToId.set(nameKey, 'AMBIGUOUS');
                }
              } else {
                uniqueNameToId.set(nameKey, node.id);
              }
            }

            for (const item of toInsertRows) {
              const newId = nameAndParentToId.get(item.existsKey);
              if (newId) {
                pathToId.set(item.row.computedPath.toLowerCase(), newId);
                importedRecords++;
                breakdown[item.row.level]++;
              }
            }
          }
        }
      },
      { timeout: 30000 },
    );

    return {
      status: 'success',
      message: 'Geo Hierarchy imported successfully',
      summary: {
        totalRecords: normalizedRows.length,
        importedRecords,
        skippedRecords,
        failedRecords: 0,
        breakdown,
      },
    };
  }

  async getTree() {
    const nodes = await this.prisma.hierarchyNode.findMany({
      orderBy: { id: 'asc' },
    });

    const buildTree = (parentId: number | null = null): any[] =>
      nodes
        .filter((n) => (n.parentId ?? null) === parentId)
        .map((n) => ({
          id: n.id,
          name: n.name,
          level: n.level,
          levelOrder: LEVEL_ORDER.indexOf(n.level),
          status: n.status,
          description: n.description,
          parentId: n.parentId,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          children: buildTree(n.id),
        }));

    return { tree: buildTree() };
  }

  async findAll(filter: GetHierarchyNodesDto) {
    const where: any = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search.trim(), mode: 'insensitive' } },
        {
          description: { contains: filter.search.trim(), mode: 'insensitive' },
        },
      ];
    }
    if (filter.level) where.level = filter.level;
    if (filter.status) where.status = filter.status;
    if (filter.parentId !== undefined) {
      where.parentId = Number(filter.parentId) || null;
    }

    const count = await this.prisma.hierarchyNode.count({ where });

    const skip = filter.skip ?? 0;
    const take = filter.take ?? 20;

    const data = await this.prisma.hierarchyNode.findMany({
      where,
      skip,
      take,
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });

    return { count, skip, take, data };
  }

  async getChildren(id: number) {
    await this.findOne(id);

    const data = await this.prisma.hierarchyNode.findMany({
      where: { parentId: id },
      orderBy: { id: 'asc' },
    });

    return { count: data.length, data };
  }

  async create(dto: CreateHierarchyNodeDto) {
    const requiredParentLevel = REQUIRED_PARENT_LEVEL[dto.level];

    if (!requiredParentLevel) {
      // Prant is root — no parent allowed, only one can exist
      if (dto.parentId) {
        throw new BadRequestException(
          `Prant is the root level and cannot have a parent node`,
        );
      }
      const existing = await this.prisma.hierarchyNode.count({
        where: { level: HierarchyLevel.Prant },
      });
      if (existing > 0) {
        throw new BadRequestException(
          `A Prant (root) node already exists. Only one root is allowed.`,
        );
      }
    } else {
      if (!dto.parentId) {
        throw new BadRequestException(
          `Level '${dto.level}' requires a parent. Expected parent level: '${requiredParentLevel}'`,
        );
      }

      const parent = await this.prisma.hierarchyNode.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent node with id ${dto.parentId} not found`,
        );
      }

      if (parent.level !== requiredParentLevel) {
        throw new BadRequestException(
          `Invalid parent for level '${dto.level}'. Expected: '${requiredParentLevel}', got: '${parent.level}'`,
        );
      }
    }

    const duplicate = await this.prisma.hierarchyNode.count({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        parentId: dto.parentId ?? null,
      },
    });

    if (duplicate > 0) {
      throw new BadRequestException(
        `A node with name '${dto.name}' already exists under the same parent`,
      );
    }

    try {
      return await this.prisma.hierarchyNode.create({
        data: {
          name: dto.name,
          level: dto.level,
          parentId: dto.parentId ?? null,
          description: dto.description ?? '',
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, dto: UpdateHierarchyNodeDto) {
    const node = await this.findOne(id);

    if (dto.name && dto.name !== node.name) {
      const duplicate = await this.prisma.hierarchyNode.count({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          parentId: node.parentId ?? null,
          NOT: { id },
        },
      });

      if (duplicate > 0) {
        throw new BadRequestException(
          `A node with name '${dto.name}' already exists under the same parent`,
        );
      }
    }

    try {
      return await this.prisma.hierarchyNode.update({
        where: { id },
        data: dto,
      });
    } catch (err) {
      throw err;
    }
  }

  async setStatus(id: number, status: HierarchyStatus) {
    await this.findOne(id);

    return await this.prisma.hierarchyNode.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: number) {
    const node = await this.findOne(id);

    // 1. Strict Leaf Node Check: Cannot delete if it has child nodes
    const childCount = await this.prisma.hierarchyNode.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete '${node.name}'. It has ${childCount} child node(s). Only leaf nodes without children can be deleted. Please delete all child nodes first.`,
      );
    }

    // 2. Active User / Designation Assignment Check
    const activeAssignments = await this.prisma.userHierarchyDesignation.count({
      where: { nodeId: id, isActive: true },
    });

    if (activeAssignments > 0) {
      throw new BadRequestException(
        `Cannot delete '${node.name}' because ${activeAssignments} user(s) are currently assigned to this point. Please unassign all users first.`,
      );
    }

    // 3. Dispatch Reference Check
    const dispatchCount = await this.prisma.dispatchEntry.count({
      where: {
        OR: [{ fromPointId: id }, { toPointId: id }],
      },
    });

    if (dispatchCount > 0) {
      throw new BadRequestException(
        `Cannot delete '${node.name}' because it has ${dispatchCount} dispatch record(s) associated with it.`,
      );
    }

    try {
      return await this.prisma.hierarchyNode.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          `Cannot delete node '${node.name}' due to existing references.`,
        );
      }
      throw err;
    }
  }

  async getReportingCandidates(id: number) {
    const node = await this.findOne(id);

    // 1. Collect upper hierarchy ancestor IDs (immediate parent up to root)
    const ancestorNodeIds: number[] = [];
    let currentParentId: number | null = node.parentId;
    while (currentParentId !== null) {
      ancestorNodeIds.push(currentParentId);
      const parentNode: { parentId: number | null } | null =
        await this.prisma.hierarchyNode.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
      currentParentId = parentNode?.parentId ?? null;
    }

    // 2. Fetch active officers from upper nodes and current point
    const eligibleNodeIds = [node.id, ...ancestorNodeIds];

    const activeAssignments =
      await this.prisma.userHierarchyDesignation.findMany({
        where: {
          nodeId: { in: eligibleNodeIds },
          isActive: true,
          user: { status: UserStatus.Active },
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              mobile: true,
              profileImage: true,
            },
          },
          node: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
        orderBy: [{ assignedAt: 'asc' }],
      });

    // 3. Map candidates with designation and node details
    const candidates = activeAssignments.map((a) => ({
      userId: a.user.id,
      name: `${a.user.firstname} ${a.user.lastname}`.trim(),
      email: a.user.email,
      mobile: a.user.mobile,
      nodeId: a.user.id,
      designationId: a.designation.id,
      designationName: a.designation.name,
      isImmediateParent: node.parentId !== null && a.node.id === node.parentId,
    }));

    // 4. Auto-select preferred reporting authority (immediate parent head first)
    let preferred = candidates.find((c) => c.isImmediateParent);
    if (!preferred && ancestorNodeIds.length > 0) {
      for (const ancestorId of ancestorNodeIds) {
        preferred = candidates.find((c) => c.nodeId === ancestorId);
        if (preferred) break;
      }
    }
    if (!preferred && candidates.length > 0) {
      preferred = candidates[0];
    }

    return {
      nodeId: node.id,
      nodeName: node.name,
      nodeLevel: node.level,
      parentId: node.parentId,
      preferredReportingAuthority: preferred ?? null,
      allReportingAuthorities: candidates,
    };
  }
}
