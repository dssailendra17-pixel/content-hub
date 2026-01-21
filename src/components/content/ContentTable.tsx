import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Content } from '@/lib/types';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ContentTableProps {
  contents: Content[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (content: Content) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function ContentTable({
  contents,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  isDeleting,
}: ContentTableProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleAll = () => {
    if (selectedIds.length === contents.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(contents.map((c) => c.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === contents.length && contents.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Title</TableHead>
              {isAdmin && <TableHead>Author</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Push Status</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 8 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No content found. Create your first content!
                </TableCell>
              </TableRow>
            ) : (
              contents.map((content) => (
                <TableRow key={content.id}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(content.id)}
                        onCheckedChange={() => toggleOne(content.id)}
                        disabled={content.push_status === 'unavailable'}
                        aria-label={`Select ${content.title}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium max-w-xs truncate">
                    {content.title}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-muted-foreground">
                      {content.author?.full_name || content.author?.username || 'Unknown'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={content.status === 'published' ? 'default' : 'secondary'}>
                      {content.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={content.push_status === 'available' ? 'outline' : 'secondary'}
                      className={
                        content.push_status === 'available'
                          ? 'border-green-500 text-green-600 dark:text-green-400'
                          : ''
                      }
                    >
                      {content.push_status === 'available' ? 'Available' : 'Pushed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {content.categories?.slice(0, 2).map((cat) => (
                        <Badge key={cat.id} variant="outline" className="text-xs">
                          {cat.name}
                        </Badge>
                      ))}
                      {(content.categories?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(content.categories?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(content.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(content)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {content.wordpress_post_id && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`${import.meta.env.VITE_WORDPRESS_URL || '#'}/?p=${content.wordpress_post_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View on WordPress
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteId(content.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
