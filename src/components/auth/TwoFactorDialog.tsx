import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface TwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: 'setup' | 'verify' | 'disable';
}

export default function TwoFactorDialog({ open, onOpenChange, onSuccess, mode }: TwoFactorDialogProps) {
  const { profile, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && mode === 'setup') {
      generateSecret();
    }
    if (!open) {
      setCode('');
      setError(null);
      setCopied(false);
    }
  }, [open, mode]);

  const generateSecret = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('totp-generate');
      if (error) throw error;
      setSecret(data.secret);
      setQrUri(data.qrUri);
    } catch (err: any) {
      setError(err.message || 'Failed to generate 2FA secret');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'setup') {
        const { error } = await supabase.functions.invoke('totp-verify', {
          body: { code, secret, action: 'enable' },
        });
        if (error) throw error;
        await refreshProfile();
        toast({ title: '2FA Enabled', description: 'Two-factor authentication has been enabled.' });
        onSuccess();
      } else if (mode === 'verify') {
        const { error } = await supabase.functions.invoke('totp-verify', {
          body: { code, action: 'verify' },
        });
        if (error) throw error;
        onSuccess();
      } else if (mode === 'disable') {
        const { error } = await supabase.functions.invoke('totp-verify', {
          body: { code, action: 'disable' },
        });
        if (error) throw error;
        await refreshProfile();
        toast({ title: '2FA Disabled', description: 'Two-factor authentication has been disabled.' });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'setup':
        return 'Set Up Two-Factor Authentication';
      case 'verify':
        return 'Two-Factor Authentication';
      case 'disable':
        return 'Disable Two-Factor Authentication';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'setup':
        return 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)';
      case 'verify':
        return 'Enter the 6-digit code from your authenticator app';
      case 'disable':
        return 'Enter your current 2FA code to disable two-factor authentication';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {mode === 'setup' && secret && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-card rounded-lg border">
                <QRCodeSVG value={qrUri} size={180} />
              </div>
              <div className="space-y-2">
                <Label>Manual Entry Code</Label>
                <div className="flex gap-2">
                  <Input value={secret} readOnly className="font-mono text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={loading}
              autoComplete="one-time-code"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || code.length !== 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'setup' ? 'Enable 2FA' : mode === 'disable' ? 'Disable 2FA' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
