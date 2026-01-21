import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useWordPressMediaUpload } from '@/hooks/useWordPressMediaUpload';
import { Upload, X, Image as ImageIcon, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  altText?: string;
  onAltTextChange?: (alt: string) => void;
}

export function ImageUploader({
  value,
  onChange,
  altText,
  onAltTextChange,
}: ImageUploaderProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const { uploadMediaAsync, isUploading, progress } = useWordPressMediaUpload();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      try {
        const result = await uploadMediaAsync({ file, altText });
        onChange(result.url);
      } catch (error) {
        // Error is handled by the hook
      }
    },
    [uploadMediaAsync, onChange, altText]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    disabled: isUploading,
  });

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
      setShowUrlInput(false);
      setUrlValue('');
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  if (value) {
    return (
      <div className="space-y-3">
        <div className="relative group">
          <img
            src={value}
            alt={altText || 'Featured image'}
            className="w-full max-w-sm h-auto rounded-lg border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground truncate max-w-sm">{value}</p>
      </div>
    );
  }

  if (showUrlInput) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button type="button" onClick={handleUrlSubmit}>
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowUrlInput(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Upload className="h-10 w-10 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">Uploading to WordPress...</p>
              <Progress value={progress} className="w-48 mt-2" />
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop image here' : 'Drag & drop an image'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (JPG, PNG, GIF, WebP • max 5MB)
              </p>
            </>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowUrlInput(true)}
        className="gap-2"
      >
        <Link className="h-4 w-4" />
        Use URL instead
      </Button>
    </div>
  );
}
