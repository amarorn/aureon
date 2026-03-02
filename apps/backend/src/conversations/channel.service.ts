import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
  ) {}

  async create(tenantId: string, dto: CreateChannelDto): Promise<Channel> {
    const channel = this.channelRepo.create({ ...dto, tenantId });
    return this.channelRepo.save(channel);
  }

  async findAll(tenantId: string): Promise<Channel[]> {
    return this.channelRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Channel> {
    const channel = await this.channelRepo.findOne({
      where: { id, tenantId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateChannelDto,
  ): Promise<Channel> {
    const channel = await this.findOne(tenantId, id);
    Object.assign(channel, dto);
    return this.channelRepo.save(channel);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.channelRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Channel not found');
  }
}
