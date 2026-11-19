# iZone — Only Apple Products

Website and business dashboard for iZone, an Apple reseller with physical shops.

Customers can:

- **Buy an iPhone**: browse live stock across every shop, filter it, open a phone's page, and contact iZone on WhatsApp, ask a question or request a reservation. There is no online payment.
- **Sell an iPhone**: use an 8-step trade-in calculator that gives a transparent estimated offer, then send an enquiry with photos or contact iZone on WhatsApp.

The owner controls the business from **/admin**: phones and stock, buying prices, selling prices, market updates, shops, transfers, trade-in enquiries, customer requests, sales and purchases, currencies, website content and the team.

The design is strict black and white, uses the original iZone logo, and works in **English, French, Arabic (right-to-left) and Polish**. Prices can be shown in **EUR, PLN and DZD**, using exchange rates you enter yourself.

---

## Technology

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend & database | Supabase (PostgreSQL, Auth, Storage) |
| Security | Row level security on every table; business rules in database functions |
| Hosting | Vercel (website), Supabase (database, files, logins) |
| Tests | SQL tests for business rules and security, plus a Playwright end-to-end suite |

### Decisions worth knowing

- **The database is the source of truth for prices.** The trade-in estimate is calculated by the database function `estimate_trade_in`. When a customer submits an enquiry, the server recalculates the offer, so a customer cannot change it.
- **Buying prices and selling prices are completely separate.**
  - Buying prices are what iZone pays customers. They are kept per model and storage, in the main currency.
  - Selling prices are set per phone, in that phone's currency.
- **Sold phones disappear automatically.** The database will only let a phone become "sold" through a recorded sale. Visitors can never read sold, hidden or unpublished phones.
- **Every price change is recorded.** Database triggers log selling prices, buying prices, deductions and exchange rates, with who changed them, when, and an optional note.
- **Nothing changes prices automatically.** Market updates happen only when an owner or manager submits them.
- **Money history stays correct.** Each sale and purchase also stores its value in the main currency at the exchange rate of that day. Profit reports are therefore not affected by later rate changes.
- **Cost data is private.** Purchase costs, IMEI numbers and internal notes live in tables that only staff can read.
- **Rendering.** Pages are always rendered live on each request, because stock and prices change all the time. Next.js 16's "Cache Components" mode is switched off; this uses the framework's documented earlier rendering model.

---

## Project structure

```
src/
  app/[locale]/…            public website (home, buy, buy/[inventoryId], sell, shops, contact, faq, search, legal pages)
  app/admin/…               dashboard (login, password reset, all management pages, CSV export)
  app/admin/actions/…       server actions (each checks the user's role; the database enforces it again)
  components/               UI (site, sell wizard, admin)
  lib/i18n/dictionaries/    en, fr, ar, pl translations
  lib/data/public.ts        public queries (anonymous; sees exactly what customers see)
  proxy.ts                  language routing + dashboard session refresh
supabase/
  migrations/               schema, functions, security, reference data, dashboard functions
  tests/database.test.sql   SQL tests for business rules and security
e2e/                        Playwright end-to-end tests
public/brand/               iZone logo, shop photo, social image
```

---

## Setup (about 20 minutes)

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com). Choose a region close to your shops.
2. Open **SQL Editor** and run the five files in `supabase/migrations/` **in order**, pasting each file and clicking *Run*:
   1. `20261119000001_schema.sql`
   2. `20261119000002_functions.sql`
   3. `20261119000003_security.sql`
   4. `20261119000004_reference_data.sql`
   5. `20261119000005_admin_rpc.sql`

   Alternatively, with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.

   This creates every table, rule and security policy, the two photo buckets, the iPhone models from X to 18 Pro Max, the default deductions, FAQs and legal pages. It does **not** create any phones, shops, buying prices or reviews.

### 2. Configure authentication

In **Authentication → Sign In / Providers → Email**:

- Turn **off** "Allow new users to sign up". Only people you add can sign in.

In **Authentication → URL Configuration**:

- **Site URL**: `https://www.your-domain.com`
- **Redirect URLs**: add `https://www.your-domain.com/admin/auth/callback` (needed for password-reset emails).

### 3. Create your owner account

1. Go to **Authentication → Users → Add user → Create new user**. Enter your email and a strong password, and tick *Auto confirm*.
2. In the **SQL Editor**, run:

   ```sql
   select public.add_admin('you@example.com', 'owner', 'Your Name');
   ```

### 4. Environment variables

Copy `.env.example` to `.env.local` for local development, and add the same values in Vercel.

| Variable | Where to find it | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Supabase → Project Settings → API keys → anon / publishable | yes |
| `NEXT_PUBLIC_SITE_URL` | Your domain, e.g. `https://www.izone.com` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) | Supabase → API keys → service_role / secret | optional; lets the owner create team accounts from Dashboard → Team. Server-side only. |

Credentials are never placed in the code. The browser only ever receives the public anon/publishable key, and row level security protects all data.

### 5. Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

### 6. Deploy to Vercel

1. Push this repository to GitHub and import it in [Vercel](https://vercel.com/new). The framework is detected automatically.
2. Add the environment variables from step 4, then deploy.
3. Add your domain under **Settings → Domains**, and use it for `NEXT_PUBLIC_SITE_URL` and in the Supabase URL settings.

### 7. First steps in the dashboard

Sign in at `/admin/login`. The overview shows a **Getting started** checklist:

1. **Shops**: add each shop with its name, address, city, country, telephone, WhatsApp number, opening hours, Google Maps link and currency.
2. **Settings**: choose the shop shown in the website's top bar, the main WhatsApp number, email and social links.
3. **Currencies**: check and confirm the exchange rates. The starting rates are only placeholders and are marked "not confirmed".
4. **Buying prices**: enter what you pay for each model and storage. Until a price exists, the calculator tells customers you will send them an offer.
5. **Inventory → Add phone**: add your stock with photos.
6. **Website content**: add genuine customer reviews (the section stays hidden until you do), and review the FAQ and legal pages in each language.
7. **iPhone models**: check the iPhone 18 entries as Apple confirms storage options and colours. "iPhone 18" is created inactive.

---

## How the trade-in estimate works

```
estimate = base price (like new, fully working, all original)
           − condition deduction      (global %, or your explicit price for that condition)
           − battery band deduction   (e.g. 90–100% 0%, 85–89% 5%, 80–84% 10%, below 80% 20%)
           − each technical defect    (Face ID, cameras, screen, touch, speakers, microphone, charging, buttons, water damage, other)
           − each replaced component  (screen, battery, cameras, other)
```

- Percentages are taken from the base price. Fixed amounts are in the main currency.
- The result is rounded **down** to the currency's rounding step and is never below the minimum offer.
- Every value is editable in **Buying prices**.
- Bulk changes are made in **Market updates**.
- In each enquiry you can set a **final offer** that overrides the estimate.

Customers always see this text:

> "This is an estimated offer based on the information provided. The final purchase price will be confirmed after physical inspection of the device."

---

## Roles

| | Staff | Manager | Owner |
| --- | :-: | :-: | :-: |
| Add/edit phones, upload photos, reserve, record sales, transfer | ✓ | ✓ | ✓ |
| Trade-in enquiries, customer requests | ✓ | ✓ | ✓ |
| Change selling prices, buying prices, deductions, market updates | | ✓ | ✓ |
| Delete phones, reverse sales, shops, models, website content, exchange rates | | ✓ | ✓ |
| Settings, add currencies, change the main currency, team | | | ✓ |

These rules are enforced in the database, so they also apply to any direct use of the API.

---

## WhatsApp

Each phone's WhatsApp button opens the shop's own WhatsApp number, or the main number if the shop has none. The pre-filled message contains the model, storage, colour, battery health, price and inventory ID.

The trade-in WhatsApp message contains the model, storage, battery health, condition, declared defects and estimated offer.

Change the numbers in **Shops** and **Settings**.

---

## Testing

- **Database tests**: `supabase/tests/database.test.sql` contains 47 checks of pricing maths, permissions, row level security, sales, transfers, bulk updates and the main-currency change. Run it against a local Supabase database (Supabase CLI) that has the three test users described at the top of the file.
- **End-to-end tests** (Playwright, 25 tests) cover:
  - store setup;
  - adding and editing a phone with photos;
  - the catalogue and WhatsApp messages;
  - reservations;
  - individual, bulk and special-offer prices and their history;
  - transfers, sales, reversing a sale and deleting a phone;
  - CSV export;
  - the full trade-in flow with photo upload, final offer and adding the phone to stock;
  - staff restrictions;
  - visitors being unable to read private data or write anything;
  - languages and right-to-left layout, currency conversion, and mobile layout.

  The end-to-end tests need the app running and an empty database with users `owner@izone.test`, `manager@izone.test` and `staff@izone.test`:

  ```bash
  npm run build && npm start -- -p 3100 &
  E2E_BASE_URL=http://127.0.0.1:3100 NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run test:e2e
  ```

---

## Good to know

- **Legal pages** (privacy, terms, trade-in conditions) are sensible templates in four languages. Have them reviewed for your country, then edit them in **Website content**.
- **Photos** are resized in the browser before upload, which makes iPhone photos fast to send. Product photos are public. Customers' trade-in photos are private and only the team can view them, through links that expire.
- **Missing pages** show the iZone "page not found" screen and are marked `noindex`. Because pages stream, the HTTP status is 200 rather than 404, which is Next.js's documented behaviour.
- Not included yet, by design: online payment, automatic exchange rates, and automatic market prices.
