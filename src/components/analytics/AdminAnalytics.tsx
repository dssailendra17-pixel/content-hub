import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useContents } from '@/hooks/useContents';
import { Users, FileText, CheckCircle, Clock, Upload } from 'lucide-react';

interface MemberStats {
  id: string;
  name: string;
  totalContents: number;
  drafts: number;
  published: number;
  pushed: number;
  available: number;
}

export function AdminAnalytics() {
  const { profile } = useAuth();
  const { contents } = useContents();

  if (profile?.role !== 'admin') {
    return null;
  }

  // Group contents by author
  const memberStatsMap = new Map<string, MemberStats>();

  contents.forEach((content) => {
    const authorId = content.created_by;
    const authorName = content.author?.full_name || content.author?.username || 'Unknown';

    if (!memberStatsMap.has(authorId)) {
      memberStatsMap.set(authorId, {
        id: authorId,
        name: authorName,
        totalContents: 0,
        drafts: 0,
        published: 0,
        pushed: 0,
        available: 0,
      });
    }

    const stats = memberStatsMap.get(authorId)!;
    stats.totalContents++;
    
    if (content.status === 'draft') {
      stats.drafts++;
    } else {
      stats.published++;
    }
    
    if (content.push_status === 'unavailable') {
      stats.pushed++;
    } else {
      stats.available++;
    }
  });

  const memberStats = Array.from(memberStatsMap.values()).sort(
    (a, b) => b.totalContents - a.totalContents
  );

  // Overall stats
  const totalContents = contents.length;
  const totalDrafts = contents.filter((c) => c.status === 'draft').length;
  const totalPublished = contents.filter((c) => c.status === 'published').length;
  const totalPushed = contents.filter((c) => c.push_status === 'unavailable').length;
  const totalAvailable = contents.filter((c) => c.push_status === 'available').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Team Analytics</h2>
        <p className="text-muted-foreground">Overview of content across all team members</p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrafts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPublished}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pushed to WP</CardTitle>
            <Upload className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPushed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Push</CardTitle>
            <Users className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAvailable}</div>
          </CardContent>
        </Card>
      </div>

      {/* Member-wise Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Content by Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No content created yet</p>
            ) : (
              memberStats.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.totalContents} total content
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{member.drafts}</p>
                      <p className="text-muted-foreground">Drafts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-green-600">{member.published}</p>
                      <p className="text-muted-foreground">Published</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-primary">{member.pushed}</p>
                      <p className="text-muted-foreground">Pushed</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-yellow-600">{member.available}</p>
                      <p className="text-muted-foreground">Available</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
