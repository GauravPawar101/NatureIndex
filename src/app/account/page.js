'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [website, setWebsite] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const getProfile = useCallback(async (user) => {
    try {
      setLoading(true);

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`username, full_name, website, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) throw error;

      if (data) {
        setUsername(data.username);
        setFullName(data.full_name);
        setWebsite(data.website);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      alert('Error loading user data!');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      router.push('/login');
      return;
    }

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      getProfile(user);
    }
    getUser();
  }, [supabase, getProfile, router]);

  async function updateProfile({ username, website, avatar_url }) {
    try {
      setLoading(true);

      let { error } = await supabase.from('profiles').upsert({
        id: user.id,
        username,
        full_name: fullName,
        website,
        avatar_url,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      alert('Profile updated!');
    } catch (error) {
      alert('Error updating the data!');
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(event) {
    try {
      setLoading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      updateProfile({ username, website, avatar_url: publicUrl });
    } catch (error) {
      alert('Error uploading avatar!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell flex items-center justify-center px-6">
      <div className="w-full max-w-lg glass-card p-8 space-y-6">
        <div>
          <span className="eyebrow mb-2">Your profile</span>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/20">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10" />
            )}
          </div>
          <div>
            <label htmlFor="avatar-upload" className="cursor-pointer btn-primary text-sm !px-4 !py-2">
              {loading ? 'Uploading...' : 'Upload Avatar'}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={loading} className="hidden" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Email</label>
          <input id="email" type="text" value={user?.email || ''} className="input-dark opacity-60" disabled />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">Username</label>
          <input id="username" type="text" value={username || ''} onChange={(e) => setUsername(e.target.value)} className="input-dark" />
        </div>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
          <input id="fullName" type="text" value={fullName || ''} onChange={(e) => setFullName(e.target.value)} className="input-dark" />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-400 mb-1">Website</label>
          <input id="website" type="url" value={website || ''} onChange={(e) => setWebsite(e.target.value)} className="input-dark" />
        </div>
        <button onClick={() => updateProfile({ username, website, avatar_url: avatarUrl })} disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Saving...' : 'Update Profile'}
        </button>
      </div>
    </div>
  );
}
