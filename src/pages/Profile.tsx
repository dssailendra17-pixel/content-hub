import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import TwoFactorDialog from '@/components/auth/TwoFactorDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<'setup' | 'disable'>('setup');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile?.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile updated', description: 'Your profile has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handle2FAClick = () => {
    setTwoFAMode(profile?.totp_enabled ? 'disable' : 'setup');
    setShow2FADialog(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-foreground">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Update your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={profile?.username || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Label>Role</Label>
              <Badge variant="secondary" className="capitalize">{profile?.role}</Badge>
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {profile?.totp_enabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5" />}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            {profile?.totp_enabled ? '2FA is currently enabled' : 'Add an extra layer of security'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant={profile?.totp_enabled ? 'destructive' : 'default'} onClick={handle2FAClick}>
            {profile?.totp_enabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </CardContent>
      </Card>

      <TwoFactorDialog open={show2FADialog} onOpenChange={setShow2FADialog} onSuccess={() => setShow2FADialog(false)} mode={twoFAMode} />
    </div>
  );
}
