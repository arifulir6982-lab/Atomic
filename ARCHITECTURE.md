# Project Atomic — Architecture

## Request flow
Browser (React) → Supabase client → Supabase Auth session and PostgreSQL API → RLS policies → PostgreSQL → React state.

The browser is untrusted. It uses only the Supabase publishable/anon key. PostgreSQL Row Level Security restricts user-owned reads and writes even if a client is modified.

## Responsibilities
- React renders screens, performs usability validation, calls database operations, and displays loading/error states.
- Supabase Auth verifies credentials and issues a persistent session.
- PostgreSQL stores profiles, habits, and completion history.
- RLS enforces ownership using the verified session (`auth.uid()`).
- Vercel serves the built frontend over HTTPS.

## Relationships
- `auth.users` 1—1 `profiles`
- `auth.users` 1—many `habits`
- `habits` 1—many `habit_completions`
- `auth.users` 1—many `habit_completions`

## Security invariants
1. Habit owner must equal authenticated user.
2. Completion owner must equal authenticated user.
3. A completion can reference only a habit owned by that user.
4. A habit can have at most one completion per date.
5. Service-role key is never exposed to the browser.

## Date behavior
Completion dates are date-only values based on the browser's local calendar. A production timezone-settings feature should persist an IANA timezone on the profile and use it consistently for server-side date boundaries.

## Deferred scope
No partner sharing, XP, AI, reminders, or real-time subscriptions until the core account lifecycle has been tested end-to-end.
