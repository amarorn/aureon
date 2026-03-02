import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

import { DataSource } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import {
  Pipeline,
  Stage,
  Contact,
  Tag,
  Opportunity,
  Interaction,
  Task,
} from '../crm/entities';

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'aureon',
    password: process.env.DB_PASSWORD || 'aureon',
    database: process.env.DB_NAME || 'aureon',
    entities: [Tenant, Pipeline, Stage, Contact, Tag, Opportunity, Interaction, Task],
    synchronize: false,
  });

  await ds.initialize();

  const tenantRepo = ds.getRepository(Tenant);
  let tenant = await tenantRepo.findOne({ where: { slug: 'default' } });
  if (!tenant) {
    tenant = tenantRepo.create({
      slug: 'default',
      name: 'Tenant Padrão',
      active: true,
    });
    await tenantRepo.save(tenant);
    console.log('Tenant criado:', tenant.id);
  }

  const pipelineRepo = ds.getRepository(Pipeline);
  const stageRepo = ds.getRepository(Stage);
  const existing = await pipelineRepo.findOne({
    where: { tenantId: tenant.id },
  });
  if (!existing) {
    const pipeline = pipelineRepo.create({
      tenantId: tenant.id,
      name: 'Vendas',
      isDefault: true,
    });
    await pipelineRepo.save(pipeline);
    const stages = [
      { name: 'Lead', order: 0, color: '#94a3b8', isWon: false },
      { name: 'Qualificado', order: 1, color: '#60a5fa', isWon: false },
      { name: 'Proposta', order: 2, color: '#a78bfa', isWon: false },
      { name: 'Negociação', order: 3, color: '#f59e0b', isWon: false },
      { name: 'Fechado', order: 4, color: '#22c55e', isWon: true },
    ];
    for (const s of stages) {
      await stageRepo.save(
        stageRepo.create({ ...s, pipelineId: pipeline.id, tenantId: tenant.id }),
      );
    }
    console.log('Pipeline e estágios criados');
  }

  console.log('DEFAULT_TENANT_ID para .env:', tenant.id);
  await ds.destroy();
}

seed().catch(console.error);
