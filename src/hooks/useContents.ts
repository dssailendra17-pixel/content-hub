import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentFormData, SeoMetadata } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useContents() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const contentsQuery = useQuery({
    queryKey: ['contents', profile?.role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contents')
        .select(`
          *,
          author:profiles!contents_created_by_fkey(*),
          seo_metadata(*),
          content_categories(
            category:wordpress_categories(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((content: any) => ({
        ...content,
        categories: content.content_categories?.map((cc: any) => cc.category) || [],
      })) as Content[];
    },
    enabled: !!profile,
  });

  const createContentMutation = useMutation({
    mutationFn: async (formData: ContentFormData) => {
      if (!profile) throw new Error('Not authenticated');

      // Create content
      const { data: content, error: contentError } = await supabase
        .from('contents')
        .insert({
          created_by: profile.id,
          title: formData.title,
          content: formData.content,
          featured_image_url: formData.featured_image_url || null,
          featured_image_alt: formData.featured_image_alt || null,
          status: formData.status,
        })
        .select()
        .single();

      if (contentError) throw contentError;

      // Create SEO metadata
      const { error: seoError } = await supabase
        .from('seo_metadata')
        .insert({
          content_id: content.id,
          seo_title: formData.seo_title || null,
          meta_description: formData.meta_description || null,
          url_slug: formData.url_slug || null,
          focus_keyword: formData.focus_keyword || null,
        });

      if (seoError) throw seoError;

      // Create category associations
      if (formData.category_ids.length > 0) {
        const categoryAssociations = formData.category_ids.map((categoryId) => ({
          content_id: content.id,
          category_id: categoryId,
        }));

        const { error: catError } = await supabase
          .from('content_categories')
          .insert(categoryAssociations);

        if (catError) throw catError;
      }

      return content;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast({
        title: 'Content created',
        description: 'Your content has been saved successfully.',
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

  const updateContentMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ContentFormData }) => {
      // Update content
      const { error: contentError } = await supabase
        .from('contents')
        .update({
          title: formData.title,
          content: formData.content,
          featured_image_url: formData.featured_image_url || null,
          featured_image_alt: formData.featured_image_alt || null,
          status: formData.status,
        })
        .eq('id', id);

      if (contentError) throw contentError;

      // Update SEO metadata
      const { error: seoError } = await supabase
        .from('seo_metadata')
        .upsert({
          content_id: id,
          seo_title: formData.seo_title || null,
          meta_description: formData.meta_description || null,
          url_slug: formData.url_slug || null,
          focus_keyword: formData.focus_keyword || null,
        });

      if (seoError) throw seoError;

      // Update category associations
      await supabase.from('content_categories').delete().eq('content_id', id);

      if (formData.category_ids.length > 0) {
        const categoryAssociations = formData.category_ids.map((categoryId) => ({
          content_id: id,
          category_id: categoryId,
        }));

        const { error: catError } = await supabase
          .from('content_categories')
          .insert(categoryAssociations);

        if (catError) throw catError;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast({
        title: 'Content updated',
        description: 'Your content has been updated successfully.',
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

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contents').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast({
        title: 'Content deleted',
        description: 'Your content has been deleted.',
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
    contents: contentsQuery.data || [],
    isLoading: contentsQuery.isLoading,
    error: contentsQuery.error,
    createContent: createContentMutation.mutate,
    updateContent: updateContentMutation.mutate,
    deleteContent: deleteContentMutation.mutate,
    isCreating: createContentMutation.isPending,
    isUpdating: updateContentMutation.isPending,
    isDeleting: deleteContentMutation.isPending,
  };
}
