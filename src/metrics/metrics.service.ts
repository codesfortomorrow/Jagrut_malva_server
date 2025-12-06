import cluster from 'node:cluster';
import { Server } from 'http';
import express from 'express';
import client from 'prom-client';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { EnvironmentVariables, LoggerService, UtilsService } from '@Common';

@Injectable()
export class MetricsService {
  private readonly logger = new LoggerService({ service: MetricsService.name });

  private server: Server;
  private registry:
    | client.Registry<client.PrometheusContentType>
    | client.AggregatorRegistry<client.PrometheusContentType>;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    private readonly utilsService: UtilsService,
  ) {}

  private async shutdown(signal: string) {
    if (!this.server) return;

    this.logger.info(`Received signal ${signal}. Shutting down...`);

    this.server.close(() => {
      this.logger.info('Server closed');
    });
  }

  private bootstrap() {
    const app = express();

    app.get('/metrics', async (req, res) => {
      try {
        if (!this.registry) {
          res.status(500).send('Metrics service not initialized');
          return;
        }

        res.setHeader('Content-Type', this.registry.contentType);
        res.send(await this.get());
      } catch (err) {
        this.logger.error('Error occurred while fetching metrics', {
          cause:
            err instanceof Error
              ? {
                  message: err.message,
                  name: err.name,
                  stack: err.stack,
                  cause: err.cause,
                }
              : err,
        });

        res.status(500).send('Unexpected error occurred');
      }
    });

    const host = '0.0.0.0';
    const port = this.configService.get('METRICS_PORT') || 8080;

    this.server = app.listen(port, host, () => {
      this.logger.info(`Metrics server running on http://${host}:${port}`);
    });

    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
  }

  async init() {
    if (this.registry) return;

    if (this.utilsService.isMaster()) {
      this.registry = new client.Registry();

      client.collectDefaultMetrics({ register: this.registry });
    } else {
      this.registry = new client.AggregatorRegistry();

      // Collect metrics from worker process
      if (cluster.isWorker) {
        this.registry.setDefaultLabels({
          worker_id: cluster.worker!.id,
        });

        client.AggregatorRegistry.setRegistries(this.registry);
        client.collectDefaultMetrics({
          register: this.registry,
        });
      }
    }

    // Run metrics server
    if (cluster.isPrimary) {
      this.bootstrap();
    }
  }

  async get(): Promise<string> {
    if (this.utilsService.isMaster()) {
      return await this.registry.metrics();
    } else {
      return await (
        this.registry as client.AggregatorRegistry<client.PrometheusContentType>
      ).clusterMetrics();
    }
  }
}
