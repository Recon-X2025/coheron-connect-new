import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const emailQueue = new Queue('email', { connection: redisConnection });
export const reportQueue = new Queue('report', { connection: redisConnection });
export const workflowQueue = new Queue('workflow', { connection: redisConnection });
