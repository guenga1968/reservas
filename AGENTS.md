# AGENTS.md - Gestor de Turnos

Reservation management web app for a 4-bungalow accommodation complex.
**Stack:** Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS v4, Supabase.

## Build / Run Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
```

### Typecheck

No ESLint or Prettier configured. Type-check only:

```bash
npx tsc --noEmit
```

### Testing

No unit test framework. E2E tests use Playwright via `test-app.js` (requires dev server running):

```bash
# Terminal 1
npm run dev

# Terminal 2 — runs all E2E route checks
node test-app.js
```

There is no way to run a single E2E test — `test-app.js` is a monolithic script. To test a specific route, temporarily comment out other tests in the file.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/              # Login page (client)
│   ├── (dashboard)/               # Protected route group
│   │   ├── layout.tsx             # Auth guard + sidebar nav
│   │   ├── page.tsx               # Dashboard home
│   │   ├── reservations/          # CRUD for reservations
│   │   │   ├── page.tsx           # List with status filters
│   │   │   ├── new/page.tsx       # Create form
│   │   │   └── [id]/page.tsx      # Detail + edit
│   │   ├── guests/                # Guest management
│   │   ├── calendar/              # Monthly availability grid
│   │   └── reports/               # Stats & charts
│   ├── layout.tsx                 # Root layout (AuthProvider)
│   └── globals.css                # Tailwind import
├── components/ui/Loading.tsx      # Shared loading spinner component
├── contexts/AuthContext.tsx        # Auth provider + useAuth hook
├── lib/
│   ├── supabase.ts                # Supabase browser client singleton
│   └── format.ts                  # formatPrice, formatDate, getStatusColor, getStatusLabel
└── types/index.ts                 # Shared interfaces: Guest, Bungalow, Reservation, Stats
supabase/schema.sql                # DB schema, RLS policies, RPC functions
test-app.js                        # Playwright E2E test script
```

Path alias: `@/*` maps to `./src/*`.

## Code Style

### General

- All dashboard pages use `'use client'` at the top.
- No comments in code unless explicitly requested.
- Prefer editing existing files over creating new ones.
- Default export per page file: `export default function PageName() { ... }`.
- Pages using `useSearchParams()` must be wrapped in `<Suspense fallback={<Loading />}>` (see `reservations/new/page.tsx`).

### Imports

- Use `@/` alias for src imports: `import { createClient } from '@/lib/supabase'`.
- Named imports from React: `import { useState, useEffect } from 'react'`.
- Type-only imports: `import type { Metadata } from 'next'`.
- Third-party type imports: `import { User } from '@supabase/supabase-js'`.
- Shared types from `@/types`: `import { Reservation, Guest } from '@/types'`.
- Shared UI: `import Loading from '@/components/ui/Loading'`.
- Format helpers from `@/lib/format`: `formatPrice`, `formatDate`, `getStatusColor`, `getStatusLabel`.

### Types

- Use `interface` over `type` for object shapes. Exception: `type` for unions like `ReservationStatus`.
- Define interfaces at the top of the file, above the component, or in `src/types/index.ts` when shared.
- Match Supabase column names exactly (snake_case): `check_in`, `full_name`, `created_at`.
- Use TypeScript `strict: true` — always type function params and returns.
- Duplicated interfaces across files is acceptable (e.g., local `Bungalow` or `Guest` interfaces for select views).

### Naming

| Scope | Convention | Example |
|---|---|---|
| Components / Pages | PascalCase | `LoginPage`, `ReservationDetailPage` |
| Functions / variables | camelCase | `loadData`, `formatPrice` |
| Interfaces | PascalCase | `Reservation`, `Guest` |
| DB fields | snake_case | `check_in`, `total_price`, `guest_id` |
| State setters | `set` + PascalCase | `setLoading`, `setReservations` |
| Supabase client var | `supabase` | `const supabase = createClient()` |

### State & Data Fetching

- Loading pattern: `const [loading, setLoading] = useState(true)` with `try/catch/finally`.
- Supabase client: call `createClient()` once at component top level, reuse across effects/handlers.
- Parallel queries: use `Promise.all([...])` when fetching independent data.
- Error state: `const [error, setError] = useState('')` for user-facing messages.
- Log unexpected errors with `console.error('Error:', err)`.
- Supabase response destructuring: `const { data } = await query` or `const { data, error } = await query`.
- Mutations: after insert/update, update local state directly instead of re-fetching.
- Use `.maybeSingle()` instead of `.single()` when zero rows is a valid result (e.g., overlap checks).
- RPC calls: `.rpc('function_name', { param_key: value })` — see `check_availability` in `reservations/new/page.tsx`.

### Error Handling

- Display user-facing errors as inline alert divs, not toasts:
  ```tsx
  {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md" role="alert">{error}</div>}
  ```
- Catch blocks: use `catch (err: unknown)` and narrow with `instanceof Error` when extracting `.message`.
- Simpler catch blocks may use untyped `catch (err)` with `console.error('Error:', err)`.

### Accessibility

- Form inputs must have `<label htmlFor="...">` matching the input `id`.
- Use `autoComplete` attributes on login form fields.
- Active nav links use `aria-current="page"`.
- Error/success banners use `role="alert"`.
- Interactive elements should have `min-h-[44px]` for touch targets.

### Styling

- Tailwind utility classes only — no CSS modules or styled-components.
- Mobile-first responsive: default mobile styles, `lg:` breakpoint for desktop.
- Color scheme: `indigo` primary, `green` success, `red` error/danger, `yellow`/`amber` warning, `gray` neutral.
- Status badge pattern: `bg-{color}-100 text-{color}-800` with `px-2 py-0.5 rounded text-xs`.
- Card pattern: `bg-white rounded-lg shadow p-4`.
- Button pattern: `bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700`.

### Forms

- Controlled components with `value` + `onChange`.
- Spread-based state updates: `setFormData({ ...formData, field: value })`.
- Loading disable: `disabled={saving}` on submit buttons.
- Submit text changes: `{saving ? 'Guardando...' : 'Guardar'}`.
- Validation: HTML `required` + custom checks before submit.
- Form state object pattern: single `formData` state with multiple fields.
- Use `e.preventDefault()` at the top of submit handlers.

### Supabase Queries

- Select with relations: `.select('*, bungalow:bungalows(name), guest:guests(full_name)')`.
- Insert: `.insert({ ... }).select('id').single()` when you need the created row.
- RPC calls: `.rpc('function_name', { param: value })`.
- Filter: `.eq()`, `.in()`, `.gte()`, `.lte()`, `.or()`.
- Single row: `.single()` at end of chain; `.maybeSingle()` when zero rows is valid.
- Throw on error: `if (error) throw error` inside try/catch.

### Routing

- Route groups: `(auth)` for public, `(dashboard)` for authenticated.
- Dynamic routes: `[id]` folder for resource detail pages.
- Navigation: `useRouter().push()` after auth actions, `<Link>` for in-app navigation.
- Auth guard: `useEffect` in dashboard layout checks `user` and redirects to `/login`.
- Back navigation: `router.back()` with a "← Volver" button on detail pages.

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Key Conventions

- Dates: ISO format `YYYY-MM-DD` for DB, `es-AR` locale for display.
- Prices: `ARS` currency, `Intl.NumberFormat('es-AR', ...)`.
- Check-in: 11:30 hs / Check-out: 10:00 hs (hardcoded in UI strings).
- Reservation statuses: `pending`, `confirmed`, `completed`, `cancelled`.
- WhatsApp copy: `navigator.clipboard.writeText(message)` with `alert()` feedback.
- UI language: Spanish (Argentina) for all user-facing text.
- Confirm before destructive actions: `if (!confirm('¿Estás seguro...?')) return`.
- DB schema, RLS policies, and RPC functions are defined in `supabase/schema.sql`.
