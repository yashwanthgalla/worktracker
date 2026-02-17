import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskService } from '../services/taskService';
import type { Task } from '../types/database.types';
import { useAppStore } from '../store/appStore';
import { NotificationService } from '../services/notificationService';
import toast from 'react-hot-toast';

export const useTasks = () => {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => TaskService.getTasks(),
    staleTime: 30000,
  });
};

export const useTask = (id: string) => {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => TaskService.getTaskById(id),
    enabled: !!id,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const addTask = useAppStore((state) => state.addTask);

  return useMutation({
    mutationFn: TaskService.createTask,
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addTask(newTask);
      toast.success('Task created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const updateTask = useAppStore((state) => state.updateTask);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      TaskService.updateTask(id, updates),
    onSuccess: (updatedTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      updateTask(updatedTask.id, updatedTask);
      toast.success('Task updated!');

      // Send completion notification if task was just completed
      if (variables.updates.status === 'completed') {
        const allTasks = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
        NotificationService.sendTaskCompletedNotification(updatedTask, allTasks).catch(console.warn);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const deleteTask = useAppStore((state) => state.deleteTask);

  return useMutation({
    mutationFn: TaskService.deleteTask,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      deleteTask(deletedId);
      toast.success('Task deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });
};

export const useSubtasks = (parentId: string) => {
  return useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: () => TaskService.getSubtasks(parentId),
    enabled: !!parentId,
  });
};
