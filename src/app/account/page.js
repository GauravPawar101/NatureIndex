'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

export default function AccountPage() {
  const supabase = createClientComponentClient();
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
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) getProfile(user);
    }
    getUser();
  }, [supabase, getProfile]);

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

  // Logic for uploading an avatar image
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
      
      // Get the new public URL and update the profile
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
    <div className="min-h-screen bg-stone-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Account Settings</h1>
        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200"></div>
            )}
          </div>
          <div>
            <label htmlFor="avatar-upload" className="cursor-pointer bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800">
              {loading ? 'Uploading...' : 'Upload Avatar'}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={loading} className="hidden" />
          </div>
        </div>
        
        {/* Profile Form */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email</label>
          <input id="email" type="text" value={user?.email || ''} className="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-gray-50" disabled />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-600">Username</label>
          <input id="username" type="text" value={username || ''} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-600">Full Name</label>
          <input id="fullName" type="text" value={fullName || ''} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-600">Website</label>
          <input id="website" type="url" value={website || ''} onChange={(e) => setWebsite(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <button onClick={() => updateProfile({ username, website, avatar_url: avatarUrl })} disabled={loading} className="w-full bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-black transition">
            {loading ? 'Saving ...' : 'Update Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}