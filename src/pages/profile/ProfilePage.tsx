import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as authService from '@/services/authService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { User, Save, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await authService.updateUserProfile(user.id, { displayName, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <User className="w-7 h-7 text-blue-600" /> Profile & Settings
      </h1>

      <Card className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Avatar name={user?.displayName || ''} size="lg" />
          <div>
            <h2 className="text-xl font-bold">{user?.displayName}</h2>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Input label="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <Input label="Email" value={user?.email || ''} disabled />
          <Input label="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          <Input label="Timezone" value={user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} disabled />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" loading={saving}>
              <Save className="w-4 h-4 mr-1" /> Save Changes
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
