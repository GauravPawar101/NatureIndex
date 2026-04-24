# Authentication Flow Diagram

## Complete Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                 │
└─────────────────────────────────────────────────────────────────────┘

1. User visits your app
   └─> https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app


2. User clicks "Sign In" or "Sign Up"
   └─> Redirected to /sign-in or /sign-up


3. Clerk UI appears with form fields:
   ┌──────────────────────────────┐
   │  Sign Up to Nature Index     │
   │                              │
   │  Email: ___________________  │
   │  First Name: ______________  │
   │  Last Name: _______________  │
   │  Username: ________________  │
   │  Password: ________________  │
   │                              │
   │  [Create Account]            │
   └──────────────────────────────┘


4. User submits form
   └─> Clerk validates and creates account
   └─> Email verification sent (if enabled)


5. User verifies email (if required)
   └─> Clerk marks email as verified


6. Clerk redirects user to:
   └─> https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
   └─> User is now signed in!


7. Clerk webhook fires (background process)
   ┌────────────────────────────────────────┐
   │  Clerk → Webhook → Your API            │
   │                                        │
   │  POST /api/webhooks/clerk              │
   │  {                                     │
   │    type: "user.created",               │
   │    data: {                             │
   │      id: "user_123",                   │
   │      email: "user@example.com",        │
   │      first_name: "John",               │
   │      last_name: "Doe",                 │
   │      username: "johndoe",              │
   │      image_url: "https://...",         │
   │      public_metadata: {                │
   │        role: "reader"                  │
   │      }                                 │
   │    }                                   │
   │  }                                     │
   └────────────────────────────────────────┘


8. Webhook syncs user to Supabase
   ┌────────────────────────────────────────┐
   │  Supabase profiles table               │
   │                                        │
   │  INSERT INTO profiles (                │
   │    user_id: "user_123",                │
   │    email: "user@example.com",          │
   │    username: "johndoe",                │
   │    full_name: "John Doe",              │
   │    avatar_url: "https://...",          │
   │    bio: null,                          │
   │    website: null,                      │
   │    twitter: null                       │
   │  )                                     │
   └────────────────────────────────────────┘


9. User can now access protected routes
   └─> /dashboard (author/admin only)
   └─> /create-post (author/admin only)
   └─> /account (authenticated users)
   └─> /admin (admin only)


10. User can update profile at /account
    └─> Clerk UserProfile component
    └─> Changes sync back to Supabase via webhook
```

## Route Protection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE PROTECTION                           │
└─────────────────────────────────────────────────────────────────────┘

Request comes in
    ↓
Middleware checks route
    ↓
    ├─> Public route? (/, /blog, /about)
    │   └─> Allow access ✅
    │
    ├─> Protected route? (/dashboard, /create-post, /account)
    │   ├─> User signed in?
    │   │   ├─> Yes → Check role
    │   │   │   ├─> Has required role? ✅ Allow
    │   │   │   └─> No role? ❌ 403 Forbidden
    │   │   └─> No → Redirect to /sign-in
    │
    └─> Admin route? (/admin)
        ├─> User is admin?
        │   ├─> Yes ✅ Allow
        │   └─> No ❌ 403 Forbidden
        └─> Not signed in → Redirect to /sign-in
```

## Server Action Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER ACTION PROTECTION                          │
└─────────────────────────────────────────────────────────────────────┘

User calls server action (e.g., createPost)
    ↓
Action calls requireRole(['admin', 'author'])
    ↓
    ├─> User signed in?
    │   ├─> Yes → Get user role from Clerk
    │   │   ├─> Role in allowed list?
    │   │   │   ├─> Yes ✅ Continue
    │   │   │   └─> No ❌ Throw error
    │   │   └─> No role → Default to 'reader' ❌ Throw error
    │   └─> No → Redirect to /sign-in
    │
    ↓
Get authenticated Supabase client
    ↓
Perform database operation with RLS
    ↓
Return result to user
```

## JWT Token Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JWT TOKEN FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

User makes request to protected route
    ↓
Server calls auth() from Clerk
    ↓
Clerk returns session with JWT
    ↓
Server calls getToken({ template: 'supabase' })
    ↓
Clerk generates Supabase-compatible JWT:
    {
      "aud": "authenticated",
      "exp": 1234567890,
      "sub": "user_123",  ← Clerk user ID
      "email": "user@example.com",
      "role": "authenticated"
    }
    ↓
Server creates Supabase client with JWT
    ↓
Supabase validates JWT and checks RLS policies:
    auth.jwt() ->> 'sub' = user_id
    ↓
    ├─> Match? ✅ Allow operation
    └─> No match? ❌ Deny operation
```

## User Profile Update Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROFILE UPDATE FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

User visits /account
    ↓
Clerk UserProfile component loads
    ↓
User updates profile (name, email, avatar, etc.)
    ↓
Clerk saves changes
    ↓
Clerk webhook fires (user.updated)
    ↓
Webhook handler receives update
    ↓
Extract updated fields:
    - email
    - first_name
    - last_name
    - image_url
    - public_metadata
    - unsafe_metadata
    ↓
Update Supabase profiles table:
    UPDATE profiles
    SET
      email = new_email,
      full_name = new_name,
      avatar_url = new_image,
      bio = new_bio,
      website = new_website,
      twitter = new_twitter,
      updated_at = NOW()
    WHERE user_id = 'user_123'
    ↓
Profile synced ✅
```

## Role Assignment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ROLE ASSIGNMENT                                 │
└─────────────────────────────────────────────────────────────────────┘

Admin wants to make user an author
    ↓
Admin goes to Clerk Dashboard
    ↓
Users → Select user → Metadata
    ↓
Add to publicMetadata:
    {
      "role": "author"
    }
    ↓
Save changes
    ↓
Clerk webhook fires (user.updated)
    ↓
Webhook syncs to Supabase (optional)
    ↓
User's next request includes new role in JWT
    ↓
Middleware and server actions check role
    ↓
User can now access author routes ✅
```

## OAuth Sign-In Flow (Optional)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      OAUTH SIGN-IN FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

User clicks "Sign in with Google"
    ↓
Clerk redirects to Google OAuth
    ↓
User authorizes app
    ↓
Google redirects back to Clerk
    ↓
Clerk creates/updates user account
    ↓
Clerk redirects to:
    https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
    ↓
Clerk webhook fires (user.created or user.updated)
    ↓
User synced to Supabase
    ↓
User is signed in ✅
```

## Summary

### Key Points

1. **Clerk handles authentication** - Sign-up, sign-in, email verification
2. **Automatic redirect** - Users go to production URL after auth
3. **Webhook syncs data** - User profiles automatically sync to Supabase
4. **JWT for authorization** - Clerk JWT used for Supabase RLS
5. **Role-based access** - Middleware and server actions enforce roles
6. **Profile management** - Clerk UI for user profile updates

### Data Flow

```
Clerk (Auth) → JWT → Supabase (Data)
     ↓
  Webhook
     ↓
Supabase profiles table
```

### Security Layers

1. **Middleware** - Route-level protection
2. **Server Actions** - Operation-level protection
3. **Supabase RLS** - Row-level security
4. **JWT Validation** - Token verification

All layers work together to ensure secure, authorized access to your application!
