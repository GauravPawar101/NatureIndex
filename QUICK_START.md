# Quick Start - Clerk Authentication

## What Changed?

Your app now uses Clerk for authentication instead of Supabase Auth. Users will be redirected to your production URL after signing in.

## Production URL
```
https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
```

## New Routes

- **Sign In**: `/sign-in` (replaces `/login`)
- **Sign Up**: `/sign-up` (new)
- **Account**: `/account` (updated with Clerk UI)

## Environment Variables Added

```bash
NEXT_PUBLIC_APP_URL=https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
```

## Next Steps

### 1. Configure Clerk (5 minutes)

Go to [Clerk Dashboard](https://dashboard.clerk.com):

1. **User & Authentication** → **Email, Phone, Username**
   - Email: Required + Verified
   - First Name: Required
   - Last Name: Required
   - Username: Optional (recommended)

2. **JWT Templates** → Create "supabase" template
   - Use default Supabase template
   - Ensures user ID is in JWT

3. **Webhooks** → Add endpoint
   - URL: `https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy webhook secret to `.env.local`

4. **Paths** → Set redirect URLs
   - After sign-in: `https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app`
   - After sign-up: `https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app`

### 2. Deploy to Vercel (2 minutes)

1. Add all environment variables from `.env.local` to Vercel
2. Deploy the application
3. Test sign-up and sign-in flows

### 3. Test (3 minutes)

- [ ] Visit `/sign-up` and create account
- [ ] Verify redirect to production URL
- [ ] Check profile created in Supabase
- [ ] Test `/sign-in`
- [ ] Update profile at `/account`

## Key Features

✅ Professional sign-in/sign-up UI  
✅ Collects all user information  
✅ Redirects to production URL  
✅ Auto-syncs to Supabase  
✅ Role-based access control  
✅ Easy to add OAuth (Google, GitHub, etc.)

## Documentation

- **Full Setup Guide**: `docs/CLERK_SETUP_GUIDE.md`
- **Migration Details**: `CLERK_MIGRATION_COMPLETE.md`

## Support

If you need help:
1. Check `docs/CLERK_SETUP_GUIDE.md` troubleshooting section
2. Verify environment variables are correct
3. Check Clerk webhook logs in dashboard

## Summary

Your authentication is now production-ready with Clerk! Just configure the Clerk dashboard and deploy to Vercel.
