import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WordPressCategory } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export function useCategories() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['wordpress-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wordpress_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as WordPressCategory[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('wordpress-categories');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-categories'] });
      toast({
        title: 'Categories synced',
        description: `${data.synced} categories synced from WordPress.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    syncCategories: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
