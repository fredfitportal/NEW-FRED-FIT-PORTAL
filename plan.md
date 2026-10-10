# Phase 1: Request-Based Scheduling and Make-Up Ledger

## Decisions
- Fresha / Google Calendar stays the final booking calendar. The portal collects requests, staff book them in Fresha, then mark the request "Approved in Fresha", "Confirmed" or "Rejected".
- Make-up cap: a client can hold at most 4 active make-ups. An early cancel past the cap is recorded as forfeited ("Exceeded 4-makeup maximum").
- Client logins are built now but tested with fictional clients only until the compliance paperwork is confirmed.
- Request notification emails go out from the studio's fredfit Gmail account.

## What gets built
1. **One shared database for requests and make-ups.** Every staff account and every client account sees the same requests and the same make-up balances. This fixes the problem where something created under one account didn't show up for another.
2. **Client request window** (one window, three simple tabs):
   - Schedule: service, location (Cowan Blvd, William St, Stafford), optional trainer, and up to 3 preferred date/time choices, all within the next 14 days.
   - Reschedule: pick one of their upcoming sessions, then up to 3 new choices within 14 days.
   - Cancel: pick a session. The portal shows right away whether it counts as early (24+ hours' notice) or late, and what that means for their make-ups.
3. **Cancellation outcome** (decided by the server, not the browser):
   - Early with fewer than 4 active make-ups: 1 make-up is issued, expiring 90 days after the missed session (matching the current rule).
   - Early with 4 already active: forfeited, with the reason recorded.
   - Late: forfeited, no make-up, and the slot is flagged as a "Last-minute opening" for staff.
4. **Staff request queue** (new Requests page): filter by status, type, location and trainer. Approve in Fresha, Confirm or Reject, each with an optional note. Updates appear live for every staff member.
5. **Make-up ledger dashboard**: staff see every client's balance (for example "2 / 4"), countdown badges, and anything expiring soon. Clients see their own balance and countdowns.
6. **Expiration and reminders**: make-ups past their date switch to Expired automatically every day. Expired and forfeited make-ups can never be used. Reminders show in the portal and go out by email 14 days and 7 days before a make-up expires.
7. **Emails**: when a request is submitted or its status changes, a structured email goes to the client and the scheduling inbox, sent from fredfit Gmail.

## What stays the same
The existing staff Schedule, recurring schedules, Partner/Trio sessions, Tasks, Team, and Assessments are unchanged. Existing code and styles are kept. No real client data is entered.

## You'll need to
- Connect the fredfit Gmail account when prompted (a one-time approval card).
- Tell me if the Stafford location is real so it can be added alongside Cowan and William Street.

## Technical details
- Migration: add `stafford` to locations; new tables `scheduling_requests` (type, original_appointment_id, service/location/trainer, preferred_1..3, status enum pending/approved_in_fresha/confirmed/rejected, staff note, decided_by/at), `makeup_ledger` (client, original_appointment_id, expiration_date, status active/used/expired/forfeited, notes, reminder_14_sent_at, reminder_7_sent_at), `client_accounts` linking an auth user to `clients.id`. GRANTs, RLS (staff read all; schedulers update; clients read/insert only their own rows via a `current_client_id()` security-definer helper), audit triggers, and realtime publication.
- A security-definer `submit_cancellation_request` function does the 24h check, cap count and ledger insert atomically. A trigger enforces the 4-cap on any insert.
- Server functions (`requireSupabaseAuth`) handle request submission and staff decisions. The Gmail send runs server-side through the connector gateway.
- `/api/public/cron/makeups` (verified with `LOVABLE_CRON_SECRET`) runs daily: expires make-ups and sends the 14-day and 7-day reminders. Scheduled with pg_cron.
- Routes: `_authenticated/requests`, `_authenticated/makeups`, plus a client area `_authenticated/my` (requests and balance) gated by the client role.
- The local make-up engine in `makeups.ts` gets the same 4-cap so the existing staff screens stay consistent. All new data is fictional seed data in the database.
