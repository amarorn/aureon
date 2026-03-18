import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewRequest } from './entities/review-request.entity';
import { CreateReviewRequestDto, CompleteReviewDto } from './dto/create-review-request.dto';

@Injectable()
export class ReviewRequestService {
  constructor(
    @InjectRepository(ReviewRequest)
    private readonly repo: Repository<ReviewRequest>,
  ) {}

  async create(tenantId: string, dto: CreateReviewRequestDto) {
    const req = this.repo.create({
      tenantId,
      contactId: dto.contactId ?? null,
      platform: dto.platform ?? 'google',
      channel: dto.channel ?? 'whatsapp',
      reviewUrl: dto.reviewUrl ?? null,
      message: dto.message ?? null,
      status: 'pending',
    });
    return this.repo.save(req);
  }

  findAll(tenantId: string) {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      relations: ['contact'],
    });
  }

  async findOne(tenantId: string, id: string) {
    const req = await this.repo.findOne({ where: { id, tenantId }, relations: ['contact'] });
    if (!req) throw new NotFoundException('Review request not found');
    return req;
  }

  async send(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.update(id, { status: 'sent', sentAt: new Date() });
    return this.findOne(tenantId, id);
  }

  async complete(tenantId: string, id: string, dto: CompleteReviewDto) {
    await this.findOne(tenantId, id);
    await this.repo.update(id, {
      status: 'completed',
      rating: dto.rating,
      comment: dto.comment ?? null,
      completedAt: new Date(),
    });
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const req = await this.findOne(tenantId, id);
    await this.repo.remove(req);
    return { ok: true };
  }

  async getStats(tenantId: string) {
    const all = await this.repo.find({ where: { tenantId } });
    const completed = all.filter((r) => r.status === 'completed' && r.rating !== null);
    const totalRating = completed.reduce((s, r) => s + (r.rating ?? 0), 0);
    const avgRating = completed.length ? totalRating / completed.length : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of completed) {
      if (r.rating && distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    }

    return {
      total: all.length,
      sent: all.filter((r) => ['sent', 'opened', 'completed'].includes(r.status)).length,
      completed: completed.length,
      avgRating: Math.round(avgRating * 10) / 10,
      distribution,
    };
  }
}
