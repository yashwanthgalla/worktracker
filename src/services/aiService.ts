import type { Task, AISuggestion } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { differenceInDays } from 'date-fns';

// Break down complex task into subtasks
export async function breakDownTask(task: Task): Promise<string[]> {
  const keywords = task.title.toLowerCase();
  const subtasks: string[] = [];

  if (keywords.includes('research')) {
    subtasks.push('Define research scope and objectives');
    subtasks.push('Gather relevant sources and materials');
    subtasks.push('Analyze and synthesize information');
    subtasks.push('Document findings and conclusions');
  } else if (keywords.includes('build') || keywords.includes('develop')) {
    subtasks.push('Plan architecture and design');
    subtasks.push('Set up development environment');
    subtasks.push('Implement core functionality');
    subtasks.push('Write tests and documentation');
    subtasks.push('Deploy and verify');
  } else if (keywords.includes('write') || keywords.includes('report')) {
    subtasks.push('Create outline and structure');
    subtasks.push('Draft initial content');
    subtasks.push('Review and revise');
    subtasks.push('Finalize and format');
  } else {
    subtasks.push('Plan and prepare');
    subtasks.push('Execute main work');
    subtasks.push('Review and finalize');
  }

  return subtasks;
}

// Predict task difficulty (1-10)
export async function predictTaskDifficulty(task: Task): Promise<number> {
  let difficulty = 5;

  if (task.description && task.description.length > 200) difficulty += 1;
  if (task.priority === 'urgent' || task.priority === 'high') difficulty += 1;
  if (task.estimated_time && task.estimated_time > 240) difficulty += 2;
  if (task.tags && task.tags.length > 3) difficulty += 1;

  return Math.min(10, Math.max(1, difficulty));
}

// Predict task duration
export async function predictTaskDuration(task: Task): Promise<number> {
  if (task.estimated_time) return task.estimated_time;

  let duration = 60;
  const titleLength = task.title.length;
  const descLength = task.description?.length || 0;

  if (titleLength > 50) duration += 30;
  if (descLength > 100) duration += 60;
  if (descLength > 300) duration += 120;

  if (task.priority === 'urgent') duration += 30;
  if (task.priority === 'high') duration += 20;

  return duration;
}

// Calculate auto-priority score
export async function calculateAutoPriority(task: Task): Promise<number> {
  let score = 50;

  if (task.due_date) {
    const daysUntilDue = differenceInDays(task.due_date, new Date());
    if (daysUntilDue < 0) score += 50;
    else if (daysUntilDue === 0) score += 40;
    else if (daysUntilDue === 1) score += 30;
    else if (daysUntilDue <= 3) score += 20;
    else if (daysUntilDue <= 7) score += 10;
  }

  const priorityScores = {
    low: 0,
    medium: 10,
    high: 20,
    urgent: 30,
  };
  score += priorityScores[task.priority];

  if (task.estimated_time && task.estimated_time > 240) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// Generate daily plan
export async function generateDailyPlan(tasks: Task[]): Promise<Task[]> {
  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );

  const tasksWithScores = await Promise.all(
    activeTasks.map(async (task) => ({
      task,
      score: await calculateAutoPriority(task),
    }))
  );

  tasksWithScores.sort((a, b) => b.score - a.score);

  const maxDailyMinutes = 480;
  let totalMinutes = 0;
  const dailyPlan: Task[] = [];

  for (const { task } of tasksWithScores) {
    const duration = await predictTaskDuration(task);
    if (totalMinutes + duration <= maxDailyMinutes) {
      dailyPlan.push(task);
      totalMinutes += duration;
    }
    if (dailyPlan.length >= 8) break;
  }

  return dailyPlan;
}

// Analyze missed tasks and provide insights
export async function analyzeMissedTasks(tasks: Task[]): Promise<string[]> {
  const missedTasks = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < new Date() &&
      t.status !== 'completed'
  );

  if (missedTasks.length === 0) {
    return ['Great job! No missed deadlines.'];
  }

  const insights: string[] = [];

  const highPriorityMissed = missedTasks.filter(
    (t) => t.priority === 'high' || t.priority === 'urgent'
  ).length;

  if (highPriorityMissed > 0) {
    insights.push(
      `You have ${highPriorityMissed} high-priority tasks overdue. Consider reviewing your prioritization strategy.`
    );
  }

  const categoryCount: Record<string, number> = {};
  missedTasks.forEach((t) => {
    if (t.category) {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    }
  });

  const topCategory = Object.entries(categoryCount).sort(
    ([, a], [, b]) => b - a
  )[0];

  if (topCategory && topCategory[1] > 2) {
    insights.push(
      `Most missed tasks are in "${topCategory[0]}" category. Consider allocating more time for this area.`
    );
  }

  if (missedTasks.length > 5) {
    insights.push(
      'You have multiple overdue tasks. Try breaking them into smaller subtasks to make progress more manageable.'
    );
  }

  return insights;
}

// Weekly improvement suggestions
export async function getWeeklySuggestions(tasks: Task[]): Promise<string[]> {
  const suggestions: string[] = [];

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const totalTasks = tasks.length;

  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  if (completionRate < 50) {
    suggestions.push(
      '📊 Your completion rate is below 50%. Try setting more realistic goals and breaking tasks into smaller chunks.'
    );
  } else if (completionRate > 80) {
    suggestions.push(
      '🌟 Excellent completion rate! You\'re on track. Consider challenging yourself with more ambitious goals.'
    );
  }

  const tasksWithBothTimes = completedTasks.filter(
    (t) => t.estimated_time && t.actual_time
  );

  if (tasksWithBothTimes.length > 3) {
    const avgEstimate =
      tasksWithBothTimes.reduce((sum, t) => sum + (t.estimated_time || 0), 0) /
      tasksWithBothTimes.length;
    const avgActual =
      tasksWithBothTimes.reduce((sum, t) => sum + (t.actual_time || 0), 0) /
      tasksWithBothTimes.length;

    const ratio = avgActual / avgEstimate;

    if (ratio > 1.5) {
      suggestions.push(
        '⏰ You\'re consistently underestimating task duration. Try adding 50% buffer time to your estimates.'
      );
    } else if (ratio < 0.7) {
      suggestions.push(
        '🚀 You\'re completing tasks faster than estimated! You can take on more challenging work.'
      );
    }
  }

  const hasRecurring = tasks.some((t) => t.is_recurring);
  if (!hasRecurring) {
    suggestions.push(
      '🔄 Consider setting up recurring tasks for routine activities to save time on planning.'
    );
  }

  return suggestions;
}

// Save AI suggestion
export async function saveSuggestion(
  taskId: string,
  suggestionType: string,
  content: any
): Promise<AISuggestion> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('ai_suggestions')
    .insert({
      user_id: user.id,
      task_id: taskId,
      suggestion_type: suggestionType,
      content,
      applied: false,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    created_at: new Date(data.created_at),
  };
}

// Apply AI suggestion
export async function applySuggestion(suggestionId: string) {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({ applied: true })
    .eq('id', suggestionId);

  if (error) throw error;
}

// Re-export as namespace for backward compat
export const AIService = {
  breakDownTask,
  predictTaskDifficulty,
  predictTaskDuration,
  calculateAutoPriority,
  generateDailyPlan,
  analyzeMissedTasks,
  getWeeklySuggestions,
  saveSuggestion,
  applySuggestion,
};
