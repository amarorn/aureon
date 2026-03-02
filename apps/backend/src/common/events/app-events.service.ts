import { Injectable } from '@nestjs/common';
import type { WorkflowEventPayload } from '../../automation/workflow.types';

export const APP_EVENTS = {
  CONTACT_CREATED: 'contact.created',
  OPPORTUNITY_CREATED: 'opportunity.created',
  OPPORTUNITY_MOVED: 'opportunity.moved',
  TASK_CREATED: 'task.created',
} as const;

@Injectable()
export class AppEventsService {
  private handlers: Map<string, ((payload: WorkflowEventPayload) => Promise<void>)[]> = new Map();

  on(event: string, handler: (payload: WorkflowEventPayload) => Promise<void>): void {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  async emit(event: string, payload: WorkflowEventPayload): Promise<void> {
    const list = this.handlers.get(event) || [];
    for (const handler of list) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[AppEvents] Handler error for ${event}:`, err);
      }
    }
  }
}
