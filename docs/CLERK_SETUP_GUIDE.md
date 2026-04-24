# Clerk Authentication Setup Guide

This guide will help you configure Clerk for complete authentication and authorization in your Nature Index application.

## Overview

Your app now uses Clerk for authentication with the following features:
- Built-in sign-in/sign-up UI with customizable fields
- User profile management
- Role-based access control (admin, author, reader)
- Automatic sync to Supabase for data storage
- Redirect to production URL after authentication

## Step 1: Configure Clerk Dashboard

### 1.1 Sign in to Clerk Dashboard
Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and select your application.

### 1.2 Configure Sign-Up Fields

Navigate to **User & Authentication** → **Email, Phone, Username**:

1. **Email Address**: 
   - Set to "Required"
   - Enable "Verify at sign-up"

2. **Username**:
   - Set to "Required" or "Optional" (recommended: Required)
   - This will be used as the display name

3. **Phone Number** (Optional):
   - Set to "Optional" if you want to collect phone numbers
   - Enable verification if required

4. **Name**:
   - Enable "First name" - Set to "Required"
   - Enable "Last name" - Set to "Required"

### 1.3 Add Custom Fields (Optional)

Navigate to **User & Authentication** → **User Metadata**:

Add these fields to `unsafe_metadata` (user-editable):
- `bio` (string) - User biography
- `website` (string) - Personal website URL
- `twitter` (string) - Twitter handle

### 1.4 Configure OAuth Providers (Optional)

Navigate to **User & Authentication** → **Social Connections**:

Enable any providers you want:
- Google
- GitHub
- Twitter
- Facebook
- etc.

### 1.5 Set Up Redirect URLs

Navigate to **Paths**:

Set the following URLs:
- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in URL**: `https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app`
- **After sign-up URL**: `https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app`

## Step 2: Configure JWT Template for Supabase

### 2.1 Create Supabase JWT Template

Navigate to **JWT Templates** → **New Template** → **Supabase**:

1. Name: `supabase`
2. Use the default Supabase template
3. The template should include:
   ```json
   {
     "aud": "authenticated",
     "exp": {{exp}},
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address}}",
     "role": "authenticated",
     "user_metadata": {
       "email": "{{user.primary_email_address}}",
       "full_name": "{{user.first_name}} {{user.last_name}}"
     }
   }
   ```

4. Save the template

### 2.2 Configure Supabase RLS Policies

Your Supabase database should have RLS policies that check:
```sql
auth.jwt() ->> 'sub' = user_id
```

This ensures that the Clerk user ID is used for authorization.

## Step 3: Set Up Webhooks

### 3.1 Create Webhook Endpoint

Navigate to **Webhooks** → **Add Endpoint**:

1. **Endpoint URL**: 
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - Production: `https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app/api/webhooks/clerk`

2. **Subscribe to events**:
   - `user.created`
   - `user.updated`
   - `user.deleted`

3. Copy the **Signing Secret** and add it to your `.env.local`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### 3.2 Test Webhook (Development)

For local development, use ngrok:
```bash
ngrok http 3000
```

Then update the webhook URL in Clerk dashboard to your ngrok URL.

## Step 4: Configure User Roles

### 4.1 Set Default Role

Navigate to **User & Authentication** → **Roles**:

1. Create roles if not already created:
   - `admin` - Full access
   - `author` - Can create and manage posts
   - `reader` - Read-only access

2. Set default role to `reader` for new users

### 4.2 Assign Roles to Users

Navigate to **Users** → Select a user → **Metadata**:

Add to `publicMetadata`:
```json
{
  "role": "author"
}
```

Or use the Clerk API:
```javascript
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'author'
  }
});
```

## Step 5: Environment Variables

Ensure your `.env.local` has all required variables:

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

## Step 6: Deploy to Vercel

### 6.1 Add Environment Variables

In your Vercel project settings, add all environment variables from `.env.local`.

### 6.2 Update Webhook URL

After deployment, update the Clerk webhook URL to your production URL:
```
https://nature-index-npxrw4kc7-gauravpawar-csbct23-glaacins-projects.vercel.app/api/webhooks/clerk
```

### 6.3 Test Production

1. Visit your production URL
2. Click "Sign In" or "Sign Up"
3. Complete the sign-up process with all required fields
4. Verify you're redirected to the production URL
5. Check that your profile was created in Supabase

## Step 7: Customize Appearance (Optional)

### 7.1 Customize Clerk Components

The sign-in/sign-up pages use Clerk's built-in components with custom styling. You can further customize in:
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

### 7.2 Theme Customization

Update the `appearance` prop in `src/app/layout.tsx`:

```typescript
<ClerkProvider
  appearance={{
    baseTheme: undefined,
    variables: {
      colorPrimary: '#0f766e', // Your brand color
      colorBackground: '#ffffff',
      borderRadius: '0.5rem',
    },
  }}
>
```

## Testing Checklist

- [ ] Sign up with email works
- [ ] Email verification works
- [ ] Sign in with email works
- [ ] OAuth providers work (if enabled)
- [ ] User profile syncs to Supabase
- [ ] Redirect to production URL after auth
- [ ] User can access dashboard
- [ ] User can update profile in /account
- [ ] Role-based access control works
- [ ] Webhook creates/updates/deletes profiles

## Troubleshooting

### Issue: Redirect not working
- Check that `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is set correctly
- Verify the URL is added to Clerk's allowed redirect URLs

### Issue: Webhook not firing
- Check webhook signing secret is correct
- Verify webhook URL is accessible (use ngrok for local dev)
- Check webhook logs in Clerk dashboard

### Issue: User not syncing to Supabase
- Check webhook is receiving events
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check Supabase logs for errors

### Issue: Role-based access not working
- Verify role is set in user's `publicMetadata`
- Check middleware is protecting routes correctly
- Ensure JWT template includes user metadata

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Supabase Integration](https://clerk.com/docs/integrations/databases/supabase)
- [Next.js App Router with Clerk](https://clerk.com/docs/quickstarts/nextjs)
