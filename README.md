# Project Atomic

A collaborative habit-building application, starting with a private, cloud-synced MVP.

## Implemented in this source
- Email/password registration and login through Supabase Auth.
- Private account data enforced by PostgreSQL row-level security.
- Create, edit, archive, and schedule habits by weekday.
- Daily completion and undo; one completion per habit per date.
- Daily progress, active habit count, check-in count, and basic current streak display.
- Responsive desktop/mobile interface and keyboard-visible focus states.

Gamification, accountability sharing, reflections, advanced analytics, reminders, and AI coaching remain later milestones.

## Stack
React + TypeScript + Vite; Supabase Auth + PostgreSQL + RLS; Vercel hosting.

## Requirements
Node.js 20.19+ or 22.12+, npm, and a Supabase project.

## Local setup
1. Clone this repository and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase project settings.
4. Execute `supabase/migrations/0001_initial_schema.sql` in Supabase Dashboard → SQL Editor.
5. Add `http://localhost:5173` to Supabase Auth → URL Configuration → Redirect URLs.
6. Run `npm run dev` and open the URL Vite prints.

## Checks
- `npm run typecheck`
- `npm run build`

## Vercel deployment
Import this existing GitHub repository into Vercel. Build command: `npm run build`; output directory: `dist`. Add the two Vite environment variables in Vercel project settings. After deployment, add the HTTPS domain to Supabase Auth URL Configuration. Test two separate accounts, habit creation, completion, refresh, and login from another device.

## Security
The publishable/anon key is designed for browser use; it is not a secret. Never add a service-role key to Vite variables. RLS enforces habit and completion ownership using `auth.uid()`. Completion ownership is checked against the referenced habit. Unique `(habit_id, completed_on)` prevents duplicate daily completion rows.

## Behavior notes
Weekdays use Sunday=0 through Saturday=6. A selected date is interpreted in the browser's local calendar. Archiving retains history; deleting a habit deletes its completion records. Streaks count consecutive scheduled days, not all calendar days.

## Status
The source is implemented locally. Supabase credentials, running the migration, and a real two-account test are required before the MVP can be called deployed or fully verified.
