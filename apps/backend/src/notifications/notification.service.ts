import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(tenantId: string, dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.repo.create({
      tenantId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      linkUrl: dto.linkUrl ?? null,
      read: false,
    });
    return this.repo.save(notification);
  }

  async findAll(tenantId: string, limit = 50): Promise<Notification[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(tenantId: string, id: string): Promise<Notification> {
    const notification = await this.repo.findOne({
      where: { id, tenantId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.read = true;
    return this.repo.save(notification);
  }

  async markAllRead(tenantId: string): Promise<void> {
    await this.repo.update({ tenantId, read: false }, { read: true });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Notification not found');
  }
}
