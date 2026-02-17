import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkSessionService } from '../services/workSessionService';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

export const useWorkSessions = () => {
  return useQuery({
    queryKey: ['workSessions'],
    queryFn: () => WorkSessionService.getSessions(),
  });
};

export const useTodaySessions = () => {
  return useQuery({
    queryKey: ['workSessions', 'today'],
    queryFn: () => WorkSessionService.getTodaySessions(),
  });
};

export const useStartSession = () => {
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

  return useMutation({
    mutationFn: ({
      taskId,
      duration,
      sessionType = 'pomodoro',
    }: {
      taskId: string | null;
      duration: number;
      sessionType?: 'pomodoro' | 'custom' | 'break';
    }) => WorkSessionService.startSession(taskId, duration, sessionType),
    onSuccess: (session) => {
      setCurrentSession(session);
      toast.success('Focus session started!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start session');
    },
  });
};

export const useEndSession = () => {
  const queryClient = useQueryClient();
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

  return useMutation({
    mutationFn: ({
      sessionId,
      completed = true,
    }: {
      sessionId: string;
      completed?: boolean;
    }) => WorkSessionService.endSession(sessionId, completed),
    onSuccess: () => {
      setCurrentSession(null);
      queryClient.invalidateQueries({ queryKey: ['workSessions'] });
      toast.success('Session completed!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to end session');
    },
  });
};
