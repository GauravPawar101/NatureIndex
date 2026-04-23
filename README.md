# Nature Index Blog

A Next.js 14 blog with Clerk authentication and Supabase database.

## 🔐 Authentication Implementation

Complete Clerk + Supabase authentication with Server Actions has been implemented.

**✅ [Setup Complete - Start Here!](./SETUP_COMPLETE.md)**

### Quick Links

- **[Start Here](./docs/START_HERE.md)** - Your entry point
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Syntax lookup while coding
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - Update existing components
- **[Architecture Guide](./docs/AUTH_SETUP.md)** - Understand the system
- **[Examples](./docs/examples/)** - See implementation examples

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── supabase/       # Typed Supabase clients
│   ├── auth/           # Auth helpers
│   ├── types/          # TypeScript types
│   └── validations/    # Zod schemas
├── actions/            # Server Actions for mutations
└── app/                # Next.js App Router pages
```

## 📚 Documentation

All documentation is in the [`docs/`](./docs/) folder:

- [START_HERE.md](./docs/START_HERE.md) - Your entry point
- [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) - Quick syntax lookup
- [AUTH_SETUP.md](./docs/AUTH_SETUP.md) - Complete architecture
- [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) - Update components
- [MIGRATION_CHECKLIST.md](./docs/MIGRATION_CHECKLIST.md) - Track progress

## 🔧 Environment Variables

Required environment variables:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
