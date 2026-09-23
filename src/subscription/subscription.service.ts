import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma';
import { NewSubscriptionRequestDto } from './dto/new-subscription-request.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prismaService: PrismaService) {}

  async subscribe(consumerId: number, data: NewSubscriptionRequestDto) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date.');
    }

    const consumer = await this.prismaService.consumer.findUnique({
      where: { id: consumerId },
      select: { id: true },
    });

    if (!consumer) throw new NotFoundException('User not found.');

    if (data.utrNumber) {
      const duplicateUtr = await this.prismaService.subscription.findFirst({
        where: { utrNumber: data.utrNumber },
        select: { id: true },
      });
      if (duplicateUtr) {
        throw new ConflictException('This UTR number has already been used.');
      }
    }

    const activeSubscription = await this.prismaService.subscription.findFirst({
      where: { consumerId, isActive: true, endDate: { gt: startDate } },
      select: { id: true },
    });
    if (activeSubscription) {
      throw new ConflictException('User already has an active subscription.');
    }

    return this.prismaService.subscription.create({
      data: {
        consumerId,
        plan: data.plan,
        startDate,
        endDate,
        isActive: true,
        paymentMode: data.paymentMode,
        utrNumber: data.utrNumber,
        remarks: data.remarks,
        externalId: data.externalId,
      },
    });
  }

  async getSubscription(userId: number) {
    const subscription = await this.prismaService.subscription.findFirst({
      where: {
        consumerId: userId,
        isActive: true,
        endDate: { gte: new Date() },
      },
      orderBy: { endDate: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No active subscription found for this user.',
      );
    }

    return subscription;
  }
}
