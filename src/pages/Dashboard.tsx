import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Image, FolderOpen, File, Loader2 } from 'lucide-react';
import { useWordPressMetrics } from '@/hooks/useWordPressMetrics';
import { AdminAnalytics } from '@/components/analytics/AdminAnalytics';

export default function Dashboard() {
  const { profile } = useAuth();
  const { metrics, isLoading } = useWordPressMetrics();
  const isAdmin = profile?.role === 'admin';

  const statsCards = [
    { title: 'Total Posts', value: metrics?.posts ?? '-', icon: FileText, color: 'text-primary' },
    { title: 'Pages', value: metrics?.pages ?? '-', icon: File, color: 'text-primary' },
    { title: 'Categories', value: metrics?.categories ?? '-', icon: FolderOpen, color: 'text-primary' },
    { title: 'Media', value: metrics?.media ?? '-', icon: Image, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name || profile?.username}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">WordPress Site Stats</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {isAdmin && <AdminAnalytics />}
    </div>
  );
}
