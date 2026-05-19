'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [website, setWebsite] = useState(null);
  const [bio, setBio] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const getProfile = useCallback(async (user) => {
    try {
      setLoading(true);

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`username, full_name, website, bio, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) throw error;

      if (data) {
        setUsername(data.username);
        setFullName(data.full_name);
        setWebsite(data.website);
        setBio(data.bio);
        setAvatarUrl(data.avatar_url || DEFAULT_AVATAR);
      } else {
        setAvatarUrl(DEFAULT_AVATAR);
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

  async function updateProfile({ username, website, bio, avatar_url }) {
    try {
      setLoading(true);

      let { error } = await supabase.from('profiles').upsert({
        id: user.id,
        username,
        full_name: fullName,
        website,
        bio,
        avatar_url: avatar_url || DEFAULT_AVATAR,
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
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      await updateProfile({ username, website, bio, avatar_url: publicUrl });
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
            <Image src={avatarUrl || DEFAULT_AVATAR} alt="Avatar" fill className="object-cover" />
          </div>
          <div>
            <label htmlFor="avatar-upload" className="cursor-pointer btn-primary text-sm !px-4 !py-2">
              {loading ? 'Uploading...' : avatarUrl && avatarUrl !== DEFAULT_AVATAR ? 'Change Avatar' : 'Add Avatar'}
            </label>
            <p className="mt-2 text-xs text-gray-400">A default avatar is assigned until you upload one.</p>
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
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
          <textarea id="bio" value={bio || ''} onChange={(e) => setBio(e.target.value)} className="input-dark min-h-28" />
        </div>
        <button onClick={() => updateProfile({ username, website, bio, avatar_url: avatarUrl })} disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Saving...' : 'Update Profile'}
        </button>
      </div>
    </div>
  );
}
