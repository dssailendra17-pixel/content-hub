import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WordPressMetrics } from '@/lib/types';

export function useWordPressMetrics() {
  const metricsQuery = useQuery({
    queryKey: ['wordpress-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('wordpress-metrics');

      if (error) throw error;
      return data as WordPressMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    refetch: metricsQuery.refetch,
  };
}
