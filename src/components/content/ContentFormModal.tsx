import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from './RichTextEditor';
import { ImageUploader } from './ImageUploader';
import { Content, ContentFormData, WordPressCategory } from '@/lib/types';
import { useCategories } from '@/hooks/useCategories';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  featured_image_url: z.string().optional(),
  featured_image_alt: z.string().optional(),
  status: z.enum(['draft', 'published']),
  category_ids: z.array(z.string()),
  seo_title: z.string().optional(),
  meta_description: z.string().optional(),
  url_slug: z.string().optional(),
  focus_keyword: z.string().optional(),
});

interface ContentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContentFormData) => void;
  content?: Content | null;
  isLoading?: boolean;
}

export function ContentFormModal({
  open,
  onClose,
  onSubmit,
  content,
  isLoading,
}: ContentFormModalProps) {
  const { categories, syncCategories, isSyncing } = useCategories();
  const [editorContent, setEditorContent] = useState(content?.content || '');

  const form = useForm<ContentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      featured_image_url: '',
      featured_image_alt: '',
      status: 'draft',
      category_ids: [],
      seo_title: '',
      meta_description: '',
      url_slug: '',
      focus_keyword: '',
    },
  });

  useEffect(() => {
    if (content) {
      form.reset({
        title: content.title,
        content: content.content || '',
        featured_image_url: content.featured_image_url || '',
        featured_image_alt: content.featured_image_alt || '',
        status: content.status,
        category_ids: content.categories?.map((c) => c.id) || [],
        seo_title: content.seo_metadata?.seo_title || '',
        meta_description: content.seo_metadata?.meta_description || '',
        url_slug: content.seo_metadata?.url_slug || '',
        focus_keyword: content.seo_metadata?.focus_keyword || '',
      });
      setEditorContent(content.content || '');
    } else {
      form.reset({
        title: '',
        content: '',
        featured_image_url: '',
        featured_image_alt: '',
        status: 'draft',
        category_ids: [],
        seo_title: '',
        meta_description: '',
        url_slug: '',
        focus_keyword: '',
      });
      setEditorContent('');
    }
  }, [content, form, open]);

  const handleSubmit = (data: ContentFormData) => {
    onSubmit({
      ...data,
      content: editorContent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{content ? 'Edit Content' : 'Create Content'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="media">Media & Categories</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 pr-4">
                <TabsContent value="content" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter title..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <RichTextEditor
                      content={editorContent}
                      onChange={setEditorContent}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="status"
                      checked={form.watch('status') === 'published'}
                      onCheckedChange={(checked) =>
                        form.setValue('status', checked ? 'published' : 'draft')
                      }
                    />
                    <Label htmlFor="status">
                      {form.watch('status') === 'published' ? 'Published' : 'Draft'}
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="featured_image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Featured Image</FormLabel>
                        <FormControl>
                          <ImageUploader
                            value={field.value}
                            onChange={field.onChange}
                            altText={form.watch('featured_image_alt')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured_image_alt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image Alt Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Describe the image..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Categories</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => syncCategories()}
                        disabled={isSyncing}
                      >
                        {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sync from WordPress
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
                      {categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground col-span-2">
                          No categories found. Click "Sync from WordPress" to fetch categories.
                        </p>
                      ) : (
                        categories.map((category) => (
                          <FormField
                            key={category.id}
                            control={form.control}
                            name="category_ids"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(category.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, category.id]);
                                      } else {
                                        field.onChange(
                                          field.value.filter((id) => id !== category.id)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {category.name}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="seo_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO optimized title..." {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {(field.value?.length || 0)}/60 characters
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meta_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description for search engines..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {(field.value?.length || 0)}/160 characters
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url_slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="my-post-url" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="focus_keyword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Focus Keyword</FormLabel>
                        <FormControl>
                          <Input placeholder="Primary keyword for SEO..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {content ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
