# Example Implementations

These are **REFERENCE FILES ONLY** - they are not meant to be built or run directly.

## Purpose

These files show complete, working examples of how to implement various features using the new auth system. Use them as templates when updating your actual application files.

## Files

### EXAMPLE_BLOG_POST_PAGE.tsx
Shows how to build a complete blog post page with:
- Server Component data fetching
- Auth checks for user-specific data
- Passing initial state to client components
- Metadata generation for SEO

**Use for**: `src/app/blog/[slug]/page.tsx`

### EXAMPLE_PROFILE_FORM.tsx
Shows how to build a profile editing form with:
- Client Component with useTransition
- Server Action integration
- Form validation
- Success/error states
- Optimistic updates

**Use for**: `src/app/account/ProfileForm.tsx` (create new file)

### EXAMPLE_ACCOUNT_PAGE.tsx
Shows how to build a protected account page with:
- Server Component with auth requirement
- Data fetching for user profile and stats
- Integration with ProfileForm component

**Use for**: `src/app/account/page.tsx` (update existing file)

## How to Use

1. **Don't import these files** - they're for reference only
2. **Copy the code** you need into your actual application files
3. **Adapt as needed** for your specific use case
4. **Follow the patterns** shown in the examples

## Important Notes

- These files are in `docs/examples/` to prevent Next.js from trying to build them
- They contain relative imports that won't work outside their intended locations
- They're meant to be copied and adapted, not used directly
- See the main documentation for step-by-step migration instructions

## Need Help?

- **Step-by-step guide**: See `../MIGRATION_GUIDE.md`
- **Quick syntax**: See `../QUICK_REFERENCE.md`
- **Full architecture**: See `../AUTH_SETUP.md`
