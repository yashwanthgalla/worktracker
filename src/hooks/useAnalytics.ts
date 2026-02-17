import { useQuery } from '@tanstack/react-query';
import { AnalyticsService } from '../services/analyticsService';
import { useAppStore } from '../store/appStore';
import { useEffect } from 'react';

export const useProductivityMetrics = () => {
  const setProductivityMetrics = useAppStore((state) => state.setProductivityMetrics);

  const query = useQuery({
    queryKey: ['productivity', 'daily'],
    queryFn: AnalyticsService.getDailyProductivityMetrics,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  useEffect(() => {
    if (query.data) {
      setProductivityMetrics(query.data);
    }
  }, [query.data, setProductivityMetrics]);

  return query;
};

export const useTaskAnalytics = () => {
  return useQuery({
    queryKey: ['analytics', 'tasks'],
    queryFn: AnalyticsService.getTaskAnalytics,
    staleTime: 60000, // 1 minute
  });
};

export const useProductivityTrends = (days: number = 30) => {
  return useQuery({
    queryKey: ['productivity', 'trends', days],
    queryFn: () => AnalyticsService.getProductivityTrends(days),
    staleTime: 300000, // 5 minutes
  });
};
