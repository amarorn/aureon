import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Opportunity } from '../crm/entities/opportunity.entity';
import { Stage } from '../crm/entities/stage.entity';
import { Contact } from '../crm/entities/contact.entity';
import { Pipeline } from '../crm/entities/pipeline.entity';

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  pipelineId?: string;
  userId?: string;
}

export interface DashboardMetrics {
  totalOpportunities: number;
  revenueWon: number;
  conversionRate: number;
  distributionByStage: { stageId: string; stageName: string; count: number; color: string }[];
  funnel: { stageName: string; count: number; color: string }[];
  salesVelocity: number;
  averageTicket: number;
  averageCycleDuration: number;
  leadSource: { source: string; count: number }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
  ) {}

  async getMetrics(tenantId: string, filters: DashboardFilters): Promise<DashboardMetrics> {
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    const where: Record<string, unknown> = { tenantId };
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;

    const stageWhere: Record<string, unknown> = { tenantId };
    if (filters.pipelineId) stageWhere.pipelineId = filters.pipelineId;

    const stages = await this.stageRepo.find({
      where: stageWhere,
      relations: ['pipeline'],
      order: { order: 'ASC' },
    });

    const stagesByPipeline = new Map<string, Stage[]>();
    for (const s of stages) {
      if (!stagesByPipeline.has(s.pipelineId)) {
        stagesByPipeline.set(s.pipelineId, []);
      }
      stagesByPipeline.get(s.pipelineId)!.push(s);
    }

    const wonStageIds = new Set(
      stages.filter((s) => s.isWon).map((s) => s.id),
    );

    if (wonStageIds.size === 0) {
      const lastStages = Array.from(stagesByPipeline.values()).map(
        (arr) => arr[arr.length - 1],
      );
      lastStages.forEach((s) => s && wonStageIds.add(s.id));
    }

    const oppQuery = this.oppRepo
      .createQueryBuilder('opp')
      .where('opp.tenant_id = :tenantId', { tenantId });

    if (filters.pipelineId) {
      oppQuery.andWhere('opp.pipeline_id = :pipelineId', {
        pipelineId: filters.pipelineId,
      });
    }

    if (startDate) {
      oppQuery.andWhere('opp.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      oppQuery.andWhere('opp.created_at <= :endDate', { endDate });
    }

    const opportunities = await oppQuery.getMany();

    const totalOpportunities = opportunities.length;

    const wonOpportunities = opportunities.filter((o) =>
      wonStageIds.has(o.stageId),
    );

    const revenueWon = wonOpportunities.reduce(
      (sum, o) => sum + Number(o.value || 0),
      0,
    );

    const conversionRate =
      totalOpportunities > 0
        ? (wonOpportunities.length / totalOpportunities) * 100
        : 0;

    const stageCounts = new Map<string, { count: number; name: string; color: string }>();
    for (const s of stages) {
      stageCounts.set(s.id, { count: 0, name: s.name, color: s.color });
    }
    for (const o of opportunities) {
      const entry = stageCounts.get(o.stageId);
      if (entry) entry.count++;
    }

    const distributionByStage = Array.from(stageCounts.entries()).map(
      ([stageId, data]) => ({
        stageId,
        stageName: data.name,
        count: data.count,
        color: data.color,
      }),
    );

    const funnel = distributionByStage
      .sort((a, b) => {
        const stageA = stages.find((s) => s.id === a.stageId);
        const stageB = stages.find((s) => s.id === b.stageId);
        return (stageA?.order ?? 0) - (stageB?.order ?? 0);
      })
      .map((d) => ({
        stageName: d.stageName,
        count: d.count,
        color: d.color,
      }));

    const periodMonths =
      startDate && endDate
        ? Math.max(1, (endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
        : 1;
    const salesVelocity = periodMonths > 0 ? revenueWon / periodMonths : 0;

    const averageTicket =
      wonOpportunities.length > 0
        ? revenueWon / wonOpportunities.length
        : 0;

    const closedWithDates = wonOpportunities.filter(
      (o) => o.closedAt,
    ) as (Opportunity & { closedAt: Date })[];
    const cycleDurations = closedWithDates.map(
      (o) =>
        new Date(o.closedAt).getTime() - new Date(o.createdAt).getTime(),
    );
    const averageCycleDuration =
      cycleDurations.length > 0
        ? cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length
        : 0;

    const contactWhere: Record<string, unknown> = { tenantId };
    if (startDate && endDate) {
      contactWhere.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      contactWhere.createdAt = Between(startDate, new Date());
    } else if (endDate) {
      contactWhere.createdAt = Between(new Date(0), endDate);
    }
    const contacts = await this.contactRepo.find({
      where: contactWhere,
      select: ['source'],
    });

    const sourceCounts = new Map<string, number>();
    for (const c of contacts) {
      const src = c.source || 'Sem origem';
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
    }
    const leadSource = Array.from(sourceCounts.entries()).map(([source, count]) => ({
      source,
      count,
    }));

    return {
      totalOpportunities,
      revenueWon,
      conversionRate,
      distributionByStage,
      funnel,
      salesVelocity,
      averageTicket,
      averageCycleDuration,
      leadSource,
    };
  }
}
