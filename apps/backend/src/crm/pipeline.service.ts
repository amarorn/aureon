import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pipeline } from './entities/pipeline.entity';
import { Stage } from './entities/stage.entity';
import { CreatePipelineDto } from './dto/create-pipeline.dto';

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
  ) {}

  async create(tenantId: string, dto: CreatePipelineDto): Promise<Pipeline> {
    if (dto.isDefault) {
      await this.pipelineRepo.update(
        { tenantId },
        { isDefault: false },
      );
    }
    const pipeline = this.pipelineRepo.create({
      name: dto.name,
      isDefault: dto.isDefault ?? false,
      tenantId,
    });
    const saved = await this.pipelineRepo.save(pipeline);
    const stages = dto.stages.map((s, i) =>
      this.stageRepo.create({
        ...s,
        order: s.order ?? i,
        pipelineId: saved.id,
        tenantId,
      }),
    );
    await this.stageRepo.save(stages);
    return this.findOne(tenantId, saved.id);
  }

  async findAll(tenantId: string): Promise<Pipeline[]> {
    return this.pipelineRepo.find({
      where: { tenantId },
      relations: ['stages'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id, tenantId },
      relations: ['stages'],
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async findDefault(tenantId: string): Promise<Pipeline | null> {
    return this.pipelineRepo.findOne({
      where: { tenantId, isDefault: true },
      relations: ['stages'],
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.pipelineRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Pipeline not found');
  }
}
