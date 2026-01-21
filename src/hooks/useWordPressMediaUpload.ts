import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadResult {
  id: number;
  url: string;
  alt_text: string;
  title: string;
}

interface UploadOptions {
  file: File;
  altText?: string;
}

export function useWordPressMediaUpload() {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async ({ file, altText }: UploadOptions): Promise<UploadResult> => {
      setProgress(10);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      setProgress(20);

      const formData = new FormData();
      formData.append('file', file);
      if (altText) {
        formData.append('alt_text', altText);
      }

      setProgress(40);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-wordpress-media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      setProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setProgress(100);

      return result;
    },
    onSuccess: (data) => {
      toast.success('Image uploaded to WordPress successfully');
      setProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload image');
      setProgress(0);
    },
  });

  return {
    uploadMedia: mutation.mutate,
    uploadMediaAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    progress,
    reset: () => {
      mutation.reset();
      setProgress(0);
    },
  };
}
