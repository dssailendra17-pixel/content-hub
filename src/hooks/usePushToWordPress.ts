import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function usePushToWordPress() {
  const queryClient = useQueryClient();

  const pushMutation = useMutation({
    mutationFn: async (contentIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('push-to-wordpress', {
        body: { content_ids: contentIds },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      
      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;

      if (failCount === 0) {
        toast({
          title: 'Success',
          description: `${successCount} content(s) pushed to WordPress successfully.`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `${successCount} succeeded, ${failCount} failed. Check console for details.`,
          variant: 'destructive',
        });
      }
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
    pushToWordPress: pushMutation.mutate,
    isPushing: pushMutation.isPending,
  };
}
