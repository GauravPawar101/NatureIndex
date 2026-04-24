# Deployment Checklist - Clerk Authentication

## Pre-Deployment Checklist

### ✅ Code Changes (Complete)
- [x] Created sign-in page at `/sign-in`
- [x] Created sign-up page at `/sign-up`
- [x] Updated Header component with Clerk UI
- [x] Updated account page with Clerk UserProfile
- [x] Updated middleware for route protection
- [x] Updated all `/login` references to `/sign-in`
- [x] Enhanced webhook to sync user data
- [x] Added redirect URLs to environment variables
- [x] Updated ClerkProvider configuration

### 📋 Clerk Dashboard Configuration (Required)

#### 1. Sign-Up Fields Configuration
- [ ] Go to **User & Authentication** → **Email, Phone, Username**
- [ ] Set **Email Address** to "Required" and enable "Verify at sign-up"
- [ ] Set **First Name** to "Required"
- [ ] Set **Last Name** to "Required"
- [ ] Set **Username** to "Optional" (or "Required" if preferred)
- [ ] Save changes

#### 2. JWT Template Setup
- [ ] Go to **JWT Templates**
- [ ] Click **New Template** → **Supabase**
- [ ] Name it `supabase`
- [ ] Verify template includes:
  ```json
  {
    "aud": "authenticated",
    "exp": {{exp}},
    "sub": "{{user.id}}",
    "email": "{{user.primary_email_address}}",
    "role": "authenticated"
  }
  ```
- [ ] Save template

#### 3. Webhook Configuration
- [ ] Go to **Webhooks** → **Add Endpoint**
- [ ] Set **Endpoint URL** to:
  ```
  https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app/api/webhooks/clerk
  ```
- [ ] Subscribe to events:
  - [x] `user.created`
  - [x] `user.updated`
  - [x] `user.deleted`
- [ ] Copy the **Signing Secret**
- [ ] Add to `.env.local` as `CLERK_WEBHOOK_SECRET`
- [ ] Save webhook

#### 4. Redirect URLs Configuration
- [ ] Go to **Paths**
- [ ] Set **Sign-in URL** to `/sign-in`
- [ ] Set **Sign-up URL** to `/sign-up`
- [ ] Set **After sign-in URL** to:
  ```
  https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
  ```
- [ ] Set **After sign-up URL** to:
  ```
  https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
  ```
- [ ] Save changes

#### 5. User Roles Setup (Optional)
- [ ] Go to **User & Authentication** → **Roles**
- [ ] Create roles if not exists:
  - [x] `admin`
  - [x] `author`
  - [x] `reader`
- [ ] Set default role to `reader`

#### 6. OAuth Providers (Optional)
- [ ] Go to **User & Authentication** → **Social Connections**
- [ ] Enable desired providers:
  - [ ] Google
  - [ ] GitHub
  - [ ] Twitter
  - [ ] Facebook
  - [ ] Others...

### 🚀 Vercel Deployment

#### 1. Environment Variables
- [ ] Go to Vercel project → **Settings** → **Environment Variables**
- [ ] Add all variables from `.env.local`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# App URLs
NEXT_PUBLIC_APP_URL=https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zjlgpxghrsxmsfihhjpi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

- [ ] Set environment for: **Production**, **Preview**, **Development**
- [ ] Save changes

#### 2. Deploy
- [ ] Commit and push changes to Git
- [ ] Vercel will auto-deploy
- [ ] Or manually trigger deployment from Vercel dashboard
- [ ] Wait for deployment to complete

#### 3. Post-Deployment
- [ ] Verify deployment succeeded
- [ ] Check deployment logs for errors
- [ ] Note the production URL

### 🧪 Testing Checklist

#### Basic Authentication
- [ ] Visit production URL
- [ ] Click "Sign In" button in header
- [ ] Verify redirected to `/sign-in`
- [ ] Click "Sign up" link
- [ ] Verify redirected to `/sign-up`

#### Sign-Up Flow
- [ ] Fill out sign-up form:
  - [ ] Email
  - [ ] First Name
  - [ ] Last Name
  - [ ] Username (if enabled)
  - [ ] Password
- [ ] Submit form
- [ ] Check email for verification (if enabled)
- [ ] Click verification link
- [ ] Verify redirected to production URL
- [ ] Verify signed in (see user avatar in header)

#### Profile Sync
- [ ] Go to Supabase dashboard
- [ ] Check `profiles` table
- [ ] Verify new user profile exists with:
  - [ ] user_id (Clerk user ID)
  - [ ] email
  - [ ] username
  - [ ] full_name
  - [ ] avatar_url

#### Sign-In Flow
- [ ] Sign out (click user avatar → Sign out)
- [ ] Click "Sign In" button
- [ ] Enter credentials
- [ ] Submit form
- [ ] Verify redirected to production URL
- [ ] Verify signed in

#### Profile Management
- [ ] Click user avatar → "Manage account"
- [ ] Or visit `/account`
- [ ] Update profile information
- [ ] Save changes
- [ ] Verify changes reflected in Clerk
- [ ] Check Supabase `profiles` table
- [ ] Verify changes synced

#### Protected Routes
- [ ] Sign out
- [ ] Try to visit `/dashboard`
- [ ] Verify redirected to `/sign-in`
- [ ] Sign in
- [ ] Try to visit `/dashboard` again
- [ ] Verify access granted (if user has author/admin role)

#### Role-Based Access
- [ ] As reader role:
  - [ ] Try to visit `/dashboard`
  - [ ] Verify 403 Forbidden
  - [ ] Try to visit `/create-post`
  - [ ] Verify 403 Forbidden
- [ ] As author role:
  - [ ] Visit `/dashboard`
  - [ ] Verify access granted
  - [ ] Visit `/create-post`
  - [ ] Verify access granted
- [ ] As admin role:
  - [ ] Visit `/admin`
  - [ ] Verify access granted

#### Webhook Testing
- [ ] Go to Clerk Dashboard → Webhooks
- [ ] Check webhook logs
- [ ] Verify events are being received:
  - [ ] `user.created` events
  - [ ] `user.updated` events
- [ ] Check for any errors
- [ ] Verify 200 OK responses

#### OAuth Testing (if enabled)
- [ ] Click "Sign in with Google" (or other provider)
- [ ] Authorize app
- [ ] Verify redirected to production URL
- [ ] Verify signed in
- [ ] Check Supabase for profile sync

### 🐛 Troubleshooting

#### Issue: Redirect not working
- [ ] Check `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is set correctly
- [ ] Verify URL is in Clerk's allowed redirect URLs
- [ ] Check browser console for errors
- [ ] Verify environment variables are loaded (check Vercel logs)

#### Issue: Webhook not firing
- [ ] Check webhook URL is correct
- [ ] Verify webhook signing secret matches
- [ ] Check webhook logs in Clerk dashboard
- [ ] Verify endpoint is accessible (test with curl)
- [ ] Check Vercel function logs

#### Issue: User not syncing to Supabase
- [ ] Check webhook is receiving events
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] Check Vercel function logs for errors
- [ ] Check Supabase logs
- [ ] Verify Supabase RLS policies allow insert

#### Issue: Role-based access not working
- [ ] Verify role is set in user's `publicMetadata`
- [ ] Check middleware is protecting routes
- [ ] Verify JWT template includes metadata
- [ ] Check server action authorization

#### Issue: Sign-up form missing fields
- [ ] Check Clerk Dashboard → User & Authentication
- [ ] Verify required fields are enabled
- [ ] Clear browser cache
- [ ] Try incognito mode

### 📊 Monitoring

#### After Deployment
- [ ] Monitor Vercel function logs
- [ ] Check Clerk webhook logs daily
- [ ] Monitor Supabase for profile sync issues
- [ ] Check error tracking (if configured)
- [ ] Monitor user sign-up rate

#### Weekly Checks
- [ ] Review Clerk webhook success rate
- [ ] Check for failed profile syncs
- [ ] Review user feedback
- [ ] Check for authentication errors

### 🎉 Launch Checklist

- [ ] All tests passing
- [ ] Webhook syncing correctly
- [ ] Redirects working
- [ ] Profile management working
- [ ] Role-based access working
- [ ] Documentation updated
- [ ] Team trained on new auth flow
- [ ] Monitoring in place

### 📚 Documentation References

- **Quick Start**: `QUICK_START.md`
- **Setup Guide**: `docs/CLERK_SETUP_GUIDE.md`
- **Migration Details**: `CLERK_MIGRATION_COMPLETE.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Auth Flow Diagram**: `docs/AUTH_FLOW_DIAGRAM.md`

### 🆘 Support

If you encounter issues:
1. Check troubleshooting section above
2. Review `docs/CLERK_SETUP_GUIDE.md`
3. Check Clerk documentation: https://clerk.com/docs
4. Check Vercel logs
5. Check Supabase logs

---

## Summary

Once all items are checked:
- ✅ Clerk is configured
- ✅ App is deployed to Vercel
- ✅ All tests pass
- ✅ Users can sign up and sign in
- ✅ Redirects work correctly
- ✅ Profiles sync to Supabase
- ✅ Role-based access works

Your authentication system is production-ready! 🚀
