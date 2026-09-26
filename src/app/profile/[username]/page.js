import { notFound } from 'next/navigation';
import ProfileContent, { ProfileHeader, ProfileStats } from './ProfileContent';
import {
    buildProfileStats,
    decodeUsername,
    getProfile,
    getProfileComments,
    getProfilePosts,
    safeWebsiteHref,
} from '../../lib/profile';
import { formatMemberSince } from '../../lib/format';

async function loadProfile(rawUsername) {
    const username = decodeUsername(rawUsername);
    if (!username) return null;

    const profile = await getProfile(username);
    if (!profile) return null;

    // Posts and comments are independent — a comments query that fails (older
    // deployment, missing table) should still render the profile.
    const [posts, comments] = await Promise.all([
        getProfilePosts(profile.id),
        getProfileComments(profile.id, 20),
    ]);

    return { profile, posts, comments };
}

export async function generateMetadata({ params }) {
    const { username } = await params;
    const loaded = await loadProfile(username);

    if (!loaded) {
        return { title: 'Profile not found' };
    }

    const { profile } = loaded;
    const displayName = profile.full_name || profile.username;

    return {
        title: displayName,
        description: profile.bio || `Articles and field notes by ${profile.username} on Nature Index.`,
        openGraph: {
            type: 'profile',
            title: displayName,
            description: profile.bio || `Articles by ${profile.username} on Nature Index.`,
        },
    };
}

export default async function ProfilePage({ params }) {
    const { username } = await params;
    const loaded = await loadProfile(username);

    if (!loaded) {
        notFound();
    }

    const { profile, posts, comments } = loaded;
    const stats = buildProfileStats(profile, posts, comments);

    return (
        <div className="page-shell">
            <div className="container mx-auto max-w-4xl px-6">
                <ProfileHeader
                    profile={profile}
                    websiteHref={safeWebsiteHref(profile.website)}
                    memberSince={formatMemberSince(profile.created_at)}
                    topPost={stats.topPost}
                />

                <div className="mt-6">
                    <ProfileStats stats={stats} />
                </div>

                <div className="mt-12">
                    <ProfileContent
                        username={profile.username}
                        website={safeWebsiteHref(profile.website)}
                        posts={posts}
                        comments={comments}
                    />
                </div>
            </div>
        </div>
    );
}
