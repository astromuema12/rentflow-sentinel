# RentFlow Sentinel

A production-oriented, Kenya-first SaaS application for property-rental financial reconciliation.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix UI
- **Database:** Neon PostgreSQL via Prisma 7
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Auth:** Auth.js credentials provider, encrypted JWT sessions, bcryptjs password hashes

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Generate a unique AUTH_SECRET and add it to .env.local
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"

# Set up database
npm run db:push

# Start development server
npm run dev
```

## Authentication and organization access

- There is no public registration, automatic login, or seeded account. Accounts and organization memberships must be provisioned by an authorized operator; the application does not create users implicitly.
- Sign in at `/sign-in`. Auth.js manages CSRF-protected credential sign-in/out and secure, HTTP-only cookies. Sessions expire after eight hours. Passwords are checked against the existing bcrypt hash field and are never stored as plaintext.
- Every protected server operation revalidates the active user and session version, then checks the user's current organization membership and minimum role. Membership changes take effect on the next request. Roles are `OWNER`, `ADMIN`, `OPERATOR`, and `VIEWER`; transaction updates require `OPERATOR`, while exports and imported-record downloads require `VIEWER`.
- `/api/organizations/:organizationId/exports` exports only that organization's transactions. The imported-record endpoint is similarly constrained by organization, import batch, and record ID. State-changing endpoints validate their payload and reject cross-origin requests.
- Password reset links require `RESEND_API_KEY` and `EMAIL_FROM`. They are single-use, expire after 30 minutes, and password reset invalidates existing sessions. Configure an authorized sender in Resend before enabling password recovery. Reset responses do not disclose whether an account exists.
- `AUTH_SECRET` must be a unique deployment secret. `AUTH_TRUST_HOST=true` is intended only behind a trusted proxy that overwrites incoming host and client-IP forwarding headers. Production cookies are marked `Secure`; local development uses HTTP cookies.
- Login and password-reset requests use database-backed rate limits. The client-IP limit relies on a trusted proxy setting `x-real-ip`; do not forward a client-supplied value as trusted.
- Apply `prisma/migrations` with `npm run db:migrate` when the database already tracks the existing migration history. For a new development database, `npm run db:push` is available. Before applying the tenant-constraint migration to a populated database, audit existing batch/run/transaction links for cross-organization references; the migration intentionally fails rather than silently accepting inconsistent rows. Review the migration and take a backup before applying schema changes to any shared database.

## Organization workspace

After signing in, `/dashboard` lists only the organizations associated with the current account. Each organization workspace has an overview, import history and batch inspection, transaction reconciliation, exceptions, reports, and settings. These screens query organization-scoped Prisma records at request time; empty states do not insert or imply sample customer data. Import history and existing batches can be inspected, but CSV upload, import processing, and starting a reconciliation run are not implemented yet.

Operators, admins, and owners can accept or reject proposed matches and resolve or ignore exceptions. Rejection, resolution, and ignore actions require a reason and are recorded as review decisions and audit events. Accepting one proposal expires other pending suggestions for the same transaction. Viewers can inspect the workspace but cannot submit these decisions. Transaction CSV export is the report format currently supported.

Any future server action, route handler, export, importer, or background job that touches tenant data must call the same server-side authorization helpers and include the organization ID in every resource read/write.

## Scripts

| Command              | Description                |
| -------------------- | -------------------------- |
| `npm run dev`        | Start dev server           |
| `npm run build`      | Production build           |
| `npm run start`      | Start production server    |
| `npm run lint`       | Run ESLint                 |
| `npm run typecheck`  | TypeScript check           |
| `npm run db:push`    | Push schema to database    |
| `npm run db:migrate` | Apply committed migrations |
| `npm run db:seed`    | Seed database              |
| `npm run test`       | Run tests                  |

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/           # Auth and organization-scoped endpoints
├── components/       # Reusable components
├── lib/              # Business logic
├── providers/        # Context providers
├── stores/           # Zustand stores
└── types/            # TypeScript types
```

## Operational notes

The authentication migration is not applied automatically at startup. Configure `DATABASE_URL`, apply the migration for the target environment, and provision user accounts through an authorized operational process before inviting users to sign in. No production account or data was created as part of this implementation.

## License

Private — All rights reserved.
