import { Queue, FlowProducer } from 'bullmq';
import { redisConnection } from './connection.js';

export const emailQueue = new Queue('email', { connection: redisConnection });
export const reportQueue = new Queue('report', { connection: redisConnection });
export const workflowQueue = new Queue('workflow', { connection: redisConnection });
export const eventsQueue = new Queue('events', { connection: redisConnection });
export const sagaQueue = new Queue('saga', { connection: redisConnection });
export const dlqQueue = new Queue('dlq', { connection: redisConnection });
export const flowProducer = new FlowProducer({ connection: redisConnection });
