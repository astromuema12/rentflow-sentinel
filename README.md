# RentFlow Sentinel

A Kenya-focused rental marketplace for exploring homes across all 47 counties. Renters can search approved homes, save favourites, and contact property managers. Landlords manage organization-owned listings and renter enquiries. Platform admins oversee accounts and review listings. The public homepage still includes a clearly labeled sample preview; only reviewed live listings appear in renter search.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix UI
- **Database:** Neon PostgreSQL via Prisma 7 (pooled runtime connection; direct connection for Prisma migrations)
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

For Neon, set `DATABASE_URL` to its pooled connection string for the app. Set `DIRECT_URL` to its direct (non-pooled) connection string for Prisma schema and migration commands. Keep both values private; add them to `.env.local` for local work and to the deployment environment for production. Prisma migrations use `DIRECT_URL` when present and otherwise fall back to `DATABASE_URL`.

## Deploying with Vercel and Neon

1. Create a Neon PostgreSQL project and copy its pooled and direct connection strings. Do not commit either string.
2. Sign in to Vercel, choose **Add New → Project**, and import `astromuema12/rentflow-sentinel` from GitHub. Keep the detected Next.js framework and default build command (`npm run build`).
3. Add these Vercel environment variables for **Production**, **Preview**, and **Development** as appropriate:
   - `DATABASE_URL`: Neon pooled connection string.
   - `DIRECT_URL`: Neon direct, non-pooled connection string. Used by Prisma CLI commands; do not use a pooled URL for migrations.
   - `AUTH_SECRET`: a unique secret generated with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
   - `AUTH_TRUST_HOST`: `true` when deployed behind Vercel's trusted proxy.
   - `NEXT_PUBLIC_APP_URL`: the deployed site's canonical HTTPS URL.
   - `NEXT_PUBLIC_APP_NAME`: `RentFlow Sentinel`.
   - `RESEND_API_KEY` and `EMAIL_FROM`: add only after configuring an authorized Resend sender; required for password-reset email.
4. Before serving the first deployment, apply the committed database migrations from a trusted local machine with `.env.local` configured: `npm run db:migrate`. Verify the command succeeds before promoting an account to `PLATFORM_ADMIN`.
5. Deploy from Vercel and check the deployment logs and site. A successful build alone does not apply database migrations or create a platform-admin account.

Never put database URLs, `AUTH_SECRET`, or email API keys in Git, client-side `NEXT_PUBLIC_*` variables, screenshots, or chat. Rotate any credential that is accidentally exposed.

## Account types and access

- Renters can create an account at `/register`. Passwords are hashed with bcrypt; registration is rate limited and creates only `RENTER` accounts.
- Landlord/property-partner accounts remain organization-provisioned. Existing users keep the safe migration default of `LANDLORD`; their `OWNER`, `ADMIN`, `OPERATOR`, or `VIEWER` membership continues to limit access within each organization.
- `PLATFORM_ADMIN` is a distinct global account type. Organization owners and organization admins do not automatically receive platform access. After applying the rental migration, an authorized operator can promote a specifically verified account using a protected database session:

  ```sql
  UPDATE "User"
  SET "accountType" = 'PLATFORM_ADMIN'
  WHERE "email" = lower('<verified-admin-email>');
  ```

- Sign in at `/sign-in`. Auth.js manages CSRF-protected credential sign-in/out and secure, HTTP-only cookies. Sessions expire after eight hours. Every protected operation revalidates the active user and session version against the database. Suspending an account revokes its active sessions.
- `/dashboard` directs renters to `/tenant/dashboard`, landlords to their organization picker and property-management workspace, and platform admins to `/admin`.
- The renter dashboard searches published homes across all 47 counties, filters by county, stay type, and bedrooms, saves homes, and sends one enquiry per listing.
- The landlord dashboard at `/landlord/:organizationId` creates listings, submits them for review, pauses published homes, edits property details (which returns the home to review), monitors renter saves/enquiries, and replies to renters. Listing writes and enquiry access are scoped to an authorized organization; `VIEWER` members are read-only.
- The admin panel at `/admin` reviews and publishes, rejects, or pauses listings and can suspend/reactivate renter and landlord accounts. It cannot change account roles or suspend platform-admin accounts. Only `PLATFORM_ADMIN` users can call admin endpoints.
- Public legal pages are available at `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/disclaimer`, `/legal/acceptable-use`, and `/legal/listing-standards`. They describe RentFlow as a marketplace for multiple kinds of residential rentals, not only short stays. These are draft policies and visibly require verified legal-entity/contact details and review by Kenyan counsel before launch.
- A new listing is not visible to renters until a platform admin approves it. Listing photos are optional and currently accept HTTPS URLs from `images.unsplash.com`; private street addresses and tenant details must not be added to public listing fields.
- Password reset links require `RESEND_API_KEY` and `EMAIL_FROM`. They are single-use, expire after 30 minutes, and password reset invalidates existing sessions. Configure an authorized sender in Resend before enabling password recovery. Reset responses do not disclose whether an account exists.
- `AUTH_SECRET` must be a unique deployment secret. `AUTH_TRUST_HOST=true` is intended only behind a trusted proxy that overwrites incoming host and client-IP forwarding headers. Production cookies are marked `Secure`; local development uses HTTP cookies.
- Login, renter registration, and password-reset requests use database-backed rate limits. The client-IP limit relies on a trusted proxy setting `x-real-ip`; do not forward a client-supplied value as trusted.
- `/api/organizations/:organizationId/exports` exports only that organization's transactions. The imported-record endpoint is similarly constrained by organization, import batch, and record ID. State-changing endpoints validate their payload and reject cross-origin requests.
- Password reset links require `RESEND_API_KEY` and `EMAIL_FROM`. They are single-use, expire after 30 minutes, and password reset invalidates existing sessions. Configure an authorized sender in Resend before enabling password recovery. Reset responses do not disclose whether an account exists.
- `AUTH_SECRET` must be a unique deployment secret. `AUTH_TRUST_HOST=true` is intended only behind a trusted proxy that overwrites incoming host and client-IP forwarding headers. Production cookies are marked `Secure`; local development uses HTTP cookies.
- Login and password-reset requests use database-backed rate limits. The client-IP limit relies on a trusted proxy setting `x-real-ip`; do not forward a client-supplied value as trusted.
- Apply `prisma/migrations` with `npm run db:migrate` when the database already tracks the existing migration history. For a new development database, `npm run db:push` is available. Before applying the tenant-constraint migration to a populated database, audit existing batch/run/transaction links for cross-organization references; the migration intentionally fails rather than silently accepting inconsistent rows. Review the migration and take a backup before applying schema changes to any shared database.

## Property and finance workspaces

Landlords select from organizations associated with their account. The property-management dashboard uses organization-owned listings and enquiries. The existing `/dashboard/:organizationId` finance workspace remains available for CSV rent-record imports, transaction reconciliation, exceptions, reports, and settings. It is separate from renter-facing marketplace inventory.

Operators, admins, and owners can accept or reject proposed matches and resolve or ignore exceptions. Rejection, resolution, and ignore actions require a reason and are recorded as review decisions and audit events. Accepting one proposal expires other pending suggestions for the same transaction. Viewers can inspect the workspace but cannot submit these decisions. Transaction CSV export is the report format currently supported.

Rental-management APIs validate same-origin state changes, validate payloads, and authorize renter, landlord organization, or platform-admin access on the server. Landlord listing and enquiry operations are scoped to the organization ID; renter saves and enquiries are scoped to the authenticated renter and published listings. New server actions, exports, importers, and background jobs must continue to apply the same authorization and tenant-scoping rules.

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

The authentication and rental migrations are not applied automatically at startup. Configure `DATABASE_URL`, review and apply committed migrations with `npm run db:migrate`, and promote a verified first platform admin through a protected operational process. A new database can use `npm run db:push` for local development. No production account, listing, or data was created as part of this implementation.

## License

Private — All rights reserved.
