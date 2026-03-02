import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallQueueItem, QueueItemStatus } from './entities/call-queue-item.entity';
import { AddToQueueDto } from './dto/add-to-queue.dto';

@Injectable()
export class CallQueueService {
  constructor(
    @InjectRepository(CallQueueItem)
    private readonly queueRepo: Repository<CallQueueItem>,
  ) {}

  async add(tenantId: string, dto: AddToQueueDto): Promise<CallQueueItem | CallQueueItem[]> {
    if (dto.contactIds?.length) {
      const maxOrder = await this.queueRepo
        .createQueryBuilder('q')
        .select('MAX(q.order)', 'max')
        .where('q.tenantId = :tenantId', { tenantId })
        .getRawOne();
      const startOrder = (maxOrder?.max ?? 0) + 1;
      const items = dto.contactIds.map((contactId, i) =>
        this.queueRepo.create({
          tenantId,
          contactId,
          order: startOrder + i,
          status: QueueItemStatus.PENDING,
        }),
      );
      return this.queueRepo.save(items);
    }
    const maxOrder = await this.queueRepo
      .createQueryBuilder('q')
      .select('MAX(q.order)', 'max')
      .where('q.tenantId = :tenantId', { tenantId })
      .getRawOne();
    const item = this.queueRepo.create({
      tenantId,
      contactId: dto.contactId,
      order: (maxOrder?.max ?? 0) + 1,
      status: QueueItemStatus.PENDING,
    });
    return this.queueRepo.save(item);
  }

  async getQueue(tenantId: string): Promise<CallQueueItem[]> {
    return this.queueRepo.find({
      where: { tenantId, status: QueueItemStatus.PENDING },
      relations: ['contact'],
      order: { order: 'ASC' },
    });
  }

  async getNext(tenantId: string): Promise<CallQueueItem | null> {
    return this.queueRepo.findOne({
      where: { tenantId, status: QueueItemStatus.PENDING },
      relations: ['contact'],
      order: { order: 'ASC' },
    });
  }

  async markCalling(tenantId: string, id: string): Promise<CallQueueItem> {
    const item = await this.findOne(tenantId, id);
    item.status = QueueItemStatus.CALLING;
    return this.queueRepo.save(item);
  }

  async markCompleted(tenantId: string, id: string): Promise<CallQueueItem> {
    const item = await this.findOne(tenantId, id);
    item.status = QueueItemStatus.COMPLETED;
    return this.queueRepo.save(item);
  }

  async markSkipped(tenantId: string, id: string): Promise<CallQueueItem> {
    const item = await this.findOne(tenantId, id);
    item.status = QueueItemStatus.SKIPPED;
    return this.queueRepo.save(item);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.queueRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Queue item not found');
  }

  async clear(tenantId: string): Promise<void> {
    await this.queueRepo.delete({ tenantId, status: QueueItemStatus.PENDING });
  }

  private async findOne(tenantId: string, id: string): Promise<CallQueueItem> {
    const item = await this.queueRepo.findOne({
      where: { id, tenantId },
      relations: ['contact'],
    });
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }
}
