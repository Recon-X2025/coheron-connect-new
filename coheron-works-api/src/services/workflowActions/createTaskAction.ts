import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

export async function executeCreateTask(config: any, context: any) {
  const { title, description, assignee, priority, dueInDays } = config;
  if (!title) {
    throw new Error('create_task requires title');
  }

  try {
    const ProjectTask = mongoose.model('ProjectTask');
    const dueDate = dueInDays ? new Date(Date.now() + dueInDays * 86400000) : undefined;

    const task = await ProjectTask.create({
      name: title,
      description,
      assigned_to: assignee,
      priority: priority || 'medium',
      due_date: dueDate,
      state: 'todo',
      tenant_id: context.tenantId ? new mongoose.Types.ObjectId(context.tenantId) : undefined,
    });

    logger.info({ taskId: task._id, title }, 'Workflow: task created');
    return { taskId: task._id, title };
  } catch (err: any) {
    logger.warn({ err }, 'Workflow: failed to create task (ProjectTask model may not be registered)');
    throw err;
  }
}
