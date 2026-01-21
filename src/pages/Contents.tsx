import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContents } from '@/hooks/useContents';
import { usePushToWordPress } from '@/hooks/usePushToWordPress';
import { useAuth } from '@/contexts/AuthContext';
import { ContentTable } from '@/components/content/ContentTable';
import { ContentFormModal } from '@/components/content/ContentFormModal';
import { Content, ContentFormData } from '@/lib/types';
import { Plus, Upload, Search, Loader2 } from 'lucide-react';

export default function Contents() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { contents, isLoading, createContent, updateContent, deleteContent, isCreating, isUpdating, isDeleting } = useContents();
  const { pushToWordPress, isPushing } = usePushToWordPress();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

  const filteredContents = contents.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const availableSelected = selectedIds.filter((id) => {
    const content = contents.find((c) => c.id === id);
    return content?.push_status === 'available';
  });

  const handleCreate = (data: ContentFormData) => {
    createContent(data, {
      onSuccess: () => {
        setModalOpen(false);
        setEditingContent(null);
      },
    });
  };

  const handleUpdate = (data: ContentFormData) => {
    if (editingContent) {
      updateContent({ id: editingContent.id, formData: data }, {
        onSuccess: () => {
          setModalOpen(false);
          setEditingContent(null);
        },
      });
    }
  };

  const handleEdit = (content: Content) => {
    setEditingContent(content);
    setModalOpen(true);
  };

  const handlePush = () => {
    if (availableSelected.length > 0) {
      pushToWordPress(availableSelected, {
        onSuccess: () => setSelectedIds([]),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contents</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage all content from your team' : 'Create and manage your content'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && availableSelected.length > 0 && (
            <Button onClick={handlePush} disabled={isPushing}>
              {isPushing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Push to WordPress ({availableSelected.length})
            </Button>
          )}
          <Button onClick={() => { setEditingContent(null); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Content
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ContentTable
          contents={filteredContents}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={handleEdit}
          onDelete={deleteContent}
          isDeleting={isDeleting}
        />
      )}

      <ContentFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingContent(null); }}
        onSubmit={editingContent ? handleUpdate : handleCreate}
        content={editingContent}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
}
