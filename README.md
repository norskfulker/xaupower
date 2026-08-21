# XAUPower

Gold-only XAUUSD signal-bot dashboard with crypto deposits, withdrawals, and a live signal feed.

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (Auth, Postgres, Realtime, RLS)
- Tailwind CSS + shadcn/ui
- Recharts
- NOWPayments sandbox

## Setup

1. Copy `.env.example` to `.env.local` (a starter `.env.local` already points at the linked Supabase project).
2. In the Supabase dashboard, copy the **service role** key into `SUPABASE_SERVICE_ROLE_KEY` (required for payment/payout webhooks).
3. Enable Email and Google providers under Authentication.
4. Add redirect URL: `http://localhost:3000/auth/callback`
5. Optional: set NOWPayments sandbox keys. The ticker reads a server-side XAUUSD cache (refresh-prices Edge Function).
6. Promote an admin after signup:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Schema

Migrations live in `supabase/migrations/`. They were applied to the remote project `bsjhsefduusvagccqajn` (Powerproof / XAUPower).

## Flows

- **Deposit (manual):** user picks package × risk tier → sends crypto to admin wallet → submits tx hash → admin approves (`approve_payment_and_activate` + ledger) or rejects.
- **Payout:** request debits available→pending → admin approve/reject → NOWPayments sandbox after approve (unchanged).
- **Transactions:** `/dashboard/transactions` read-only ledger.
- **Signals:** admin posts/closes; users get Realtime feed updates.

## Admin setup

1. Replace placeholder deposit addresses at `/admin/settings/wallets`.
2. Set `RESEND_API_KEY` + `ADMIN_NOTIFICATION_EMAIL` for deposit alerts.
3. Promote an admin:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```
