# Periscope Mining System V1

A role-based payroll, attendance and expense-control system for Periscope's labour operations.

## V1 business flow

### Payroll
`Site Clerk attendance → HR approval → Accountant payroll preparation → CEO approval → CEO PAY ALL → Accountant Payment Processing → payment result/audit trail`

### Expenses
`Site Clerk request → Accountant review → CEO approval → CEO PAY EXPENSE → Accountant Payment Processing → final ledger`

Site advances continue through Site Clerk reconciliation and Accountant verification before the actual spend is finalized in the ledger.

## Roles
- **Admin** — system users, sites, Site Clerk assignments, permissions and audit logs.
- **Site Clerk** — assigned-site attendance, roster submission, expense requests and advance reconciliation.
- **HR** — employee master data, site assignments, contracts/compliance, documents, absences, payout details and roster approval.
- **Accountant** — payroll preparation, expense review, normalized expense payees and processing CEO-released payments.
- **CEO** — final payroll/expense approval, PAY ALL / PAY EXPENSE release and payment-status monitoring.

## Payment model
V1 does not pretend that the web application itself transfers funds. The CEO releases an immutable payment run; Finance/Accountant processes the released instructions using the company's real FNB / Orange Money / P2C / eWallet process and records the real settlement result/reference for each recipient.

Payroll batches include a **Scheduled Payday** so late payroll can be identified before or on the intended payment date.

## Tech stack
- Next.js 16 App Router
- React 19
- JavaScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + Storage
- Vercel deployment target

The Supabase service-role key is server-only. Browser code uses the public anon key and protected server routes/RPCs enforce business authorization.

## Local setup
```bash
cd payroll-system
npm ci
npm run dev
```

Create `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_*` variable.

## Production build
Before deployment:
```bash
cd payroll-system
npm ci
npm run build
```

Do not deploy if the production build fails.

## Vercel
Set the three required Supabase environment variables in the Vercel project and use `payroll-system` as the application root directory if the repository root is connected to Vercel.

## UAT and deployment
The role-by-role demonstration, acceptance tests and deployment checklist are in:

`docs/V1_DEMO_UAT_AND_DEPLOYMENT_GUIDE.md`

Run at least one complete test payroll, one direct-vendor expense and one site-advance reconciliation after deployment before using live payroll/payment data.

## Current V1 payment limitation
The internal payment-run architecture is implemented, including CEO release, immutable payment instructions, per-recipient statuses, references, failures and retry. Direct FNB/API fund initiation is not enabled yet. Periscope's current banking/mobile-money process remains the external payment rail until the company provides and validates the required integration/file specification.
