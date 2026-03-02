import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { IntegrationProvider } from '../entities/integration.entity';

export class CreateIntegrationDto {
  @IsEnum(IntegrationProvider)
  provider: IntegrationProvider;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
