# Tasks / Action Items — proposed design (privacy first)

One shared task system. Every surface — the Tasks page, client profiles, staff profiles, the dashboard, a direct task link — reads the same records through a single permission filter, so nothing separate can leak.

## Permission model

Access is decided by role, in one place, before any task is returned to the screen.

**Executive / owner level — Jennifer Scherer and Jessie Domi** (both already carry the Owner role in the portal)
- See every task at FFS, including each other's and all leadership tasks.
- Create, edit, assign, reassign and complete any task.
- Get the "All tasks" views and the filter by employee.

**Leadership — Jen Sawyer, Meagan Freiwald**
- See tasks assigned to them, tasks they created, and tasks explicitly shared with them.
- Do **not** see Jennifer's or Jessie's tasks, and do not see each other's tasks unless a task is shared or co-assigned.

**General staff**
- See tasks assigned to them, tasks they created, and tasks explicitly shared with them. Nothing else.

Visibility is deliberately one-directional: owners seeing a leader's tasks never grants that leader sight of an owner's tasks.

**How it's enforced:** a single function decides whether a given user may see a given task, and every read of tasks anywhere in the portal goes through it — list, search, filters, client profile, staff profile, dashboard counts, and opening a task by its link. A task the user may not see returns "not found", not an empty shell. Editing, reassigning and completing run the same check plus an edit check (owner, creator, or assignee) before anything is written. No screen filters a fuller list down in the browser.

A caveat worth stating plainly: this build has no real login — staff pick which demo user they are acting as. The rules are enforced in the data layer exactly as described, but with a shared demo browser they are honest role simulation, not security against a determined person. Real enforcement arrives with real accounts and a server, which is out of scope here.

## What a task holds

Title (required) · notes · assigned to (a staff member) · due date (optional) · priority Low/Normal/High · status Open/In Progress/Completed · related client (optional) · category (Client Follow-Up, Scheduling, Billing, Staff/HR, Operations, Marketing, Programming, Other) · created by + created date · completed by + completed date/time · **shared with** (optional list of staff who may also see it).

Completed tasks stay in history — never deleted — and drop out of the default outstanding view.

## The Tasks page

New page at `/tasks`, replacing the "coming later" sidebar entry. It defaults to outstanding work (Open + In Progress) grouped into **Overdue** (strongest visual treatment), **Due Today**, **Upcoming**, **No Due Date**.

- Everyone sees a **My Tasks** view plus anything shared with them.
- Jennifer and Jessie additionally see **All Outstanding Tasks** and a **By staff member** filter, so "what does Meagan still have outstanding?" is one click.
- Filters: assignee (owners only), status, priority, category, related client, due-date range, and a Completed/history view. Filters live in the page address so dashboard links can open a pre-filtered view.
- **+ Add Task** is prominent: title, assignee and due date only, with a "More details" expander for notes, priority, status, category, related client and sharing.

## Client, staff and dashboard views

- **Client profile** — an Action Items area with that client's outstanding and recent completed tasks, filtered to what the viewer may see. A private executive task attached to a client stays invisible to staff who can open that client.
- **Staff profile** — outstanding tasks for that staff member: your own on your own profile, everyone's for Jennifer and Jessie, and nothing for anyone else viewing a colleague.
- **Dashboard** — a My Tasks card with overdue / due today / upcoming counts for the signed-in user; Jennifer and Jessie also get an FFS Outstanding Tasks summary. Both link into `/tasks` with the matching filter.

## Technical notes

- New `Task` type in `types.ts`; new `tasks: Task[]` collection in the existing local store with its current persistence — existing synthetic data is preserved and never reset.
- New `src/lib/domain/tasks.ts` holding `canViewTask` / `canEditTask` and all list, group and filter helpers; repository read/write functions apply the viewer filter internally so no caller can bypass it.
- New route `src/routes/tasks.tsx`, a `TaskFormDialog`, and a shared `TaskList` used by all three surfaces.
- A handful of fictional seed tasks across owners, leadership and trainers so the permission behaviour is demonstrable.
- No scheduling, recurring, make-up, client or staff logic is touched.

## Decisions I need from you

1. **Shared tasks** — I've included an optional "shared with" list. Keep it, or restrict visibility purely to assignee + creator + owners?
2. **Who may complete** — anyone who can see a task, or only the assignee, its creator, and Jennifer/Jessie?
3. **Creating tasks for others** — may leadership assign tasks to general staff, or should assigning to someone else be owner-only?
4. **Leadership breadth** — should Jen and Meagan see tasks for staff they directly manage, or strictly only their own plus shared?
