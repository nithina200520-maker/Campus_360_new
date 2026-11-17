# Campus Admin API

The Flask service is the source of truth for users, module configuration, and
admin grants. Run `python migrate_campus_admin.py` before deploying this API.
The repeatable migration creates the module/assignment and setup-state tables,
adds notification and audit attribution fields plus the unique Main Admin guard,
creates the handoff-code table, seeds default modules, and converts legacy
`users.admin_scope` values into active assignments.

All API routes below use `/api/campus-admin`. Except for setup status, one-time setup, handoff claim, login, and logout,
send `Authorization: Bearer <JWT>`.
Login accepts
`{ "email": "...", "password": "..." }` (or `identifier` instead of `email`),
authenticates only an existing Main Admin, returns a JWT and sets a Flask
session cookie. Student and faculty Flask API logins also set that browser
session. JWT identity and active assignments are looked up from the database
on every request; JWT role/module claims are not authorization sources.

| Method and path | Access | Response |
| --- | --- | --- |
| `GET /setup-status` | Public, read-only | `{setup_available}` |
| `POST /setup` | One-time setup token | Creates the first Main Admin, returns `{success, token, user}` |
| `POST /handoff` | Current Main Admin JWT and password reauthentication | Issues one single-use code, valid for 30 minutes |
| `POST /handoff/claim` | Valid handoff code | Creates a standalone Main Admin account and transfers the role |
| `POST /login` | Existing Main Admin credentials | `{success, token, user}` |
| `POST /logout` | Clears caller's Flask browser session | `{success}` |
| `GET /me` | Authenticated | `{user, is_main_admin, admin_modules}` |
| `GET /overview` | Main Admin | Live `counts`, `recent_activity`, `activity`, and `notifications` |
| `GET /users?q=&role=&status=` | Main Admin | `{users: [...]}` |
| `PATCH /users/<id>/status` | Main Admin | Updates account status and records an audit event |
| `DELETE /users/<id>` | Main Admin | Permanently deletes a student account after matching its USN |
| `GET /modules` | Main Admin | `{modules: [...]}` |
| `POST /modules` | Main Admin | `{module: {...}}` |
| `PATCH /modules/<id>` | Main Admin | `{module: {...}}` |
| `GET /assignments?module=&status=` | Main Admin | `{assignments: [...]}` |
| `POST /assignments` | Main Admin | `{assignment: {...}}` |
| `PATCH /assignments/<id>` | Main Admin | `{assignment: {...}}` |
| `GET /activity?module=&action=&role=&since=&until=` | Main Admin or active module grant | `{activity: [...]}` |
| `GET /notifications?module=&unread=true` | Main Admin or active module grant | `{notifications: [...]}` |
| `POST /notifications` | Main Admin or active module grant | `{notifications: [...]}` |

Module creation accepts `key`, `name`, optional `description`, and optional
`is_active`. Keys are immutable after creation. Assignments are limited to active,
verified existing student and faculty accounts. They accept `user_id`,
`module_id` (or module key), and optional permissions from
`notifications:read`, `notifications:send`, and `activity:read`. Assignment
patches accept `status` (`active`, `suspended`, `revoked`), `user_id`,
`module_id`, `permissions`, or `action` (`reactivate`, `suspend`, `revoke`,
`transfer`). Account status updates accept `active` or `inactive`; the Main
Admin account cannot be modified through this endpoint. Student deletion
requires a JSON body containing the exact registered `identifier` (USN).
It removes the student account and personal registry data while retaining
canteen orders and related financial records without the deleted account link.
Deletion attempts are recorded in the protected audit log.

Before deploying student deletion to an existing database, run
`python migrate_student_account_deletion.py`. The migration backs up an existing
SQLite database and changes canteen order ownership to `ON DELETE SET NULL` so
financial history is preserved.

For first-time initialization, configure `MAIN_ADMIN_SETUP_TOKEN` in the Flask
environment (or the project `.env` file) with a random value at least 32
characters long. With Docker Compose, the value is passed into the Flask
container from `.env`. Enter this exact value in the setup form; it is separate
from the Main Admin account password. Restart the Flask service after changing
the value. The login page shows the setup form only while no Main Admin exists
and a valid token is configured. Setup requires a name, unique email, token,
and password of at least 12 characters; passwords are hashed by the existing
user model. A unique
database guard prevents concurrent requests from creating a second Main Admin,
and a persistent setup-state row keeps initialization disabled even if the
account row is later removed. After initialization, remove
`MAIN_ADMIN_SETUP_TOKEN` from the environment. Existing deployments must run
`python migrate_campus_admin.py` to add the guard column, unique index,
setup-state marker, and handoff table; migration stops if multiple Main Admin
accounts already exist so they can be resolved explicitly.

Main Admin accounts are standalone and do not need a Student or Faculty account.
For a handoff, the signed-in Main Admin explicitly requests a code and
reauthenticates with their password. Only a hash is stored; the raw code is
returned once and expires after 30 minutes. A newer code revokes prior pending
codes. Claiming a valid code creates a new Main Admin with a unique email,
deactivates and demotes the prior account, updates the setup marker, and
invalidates the prior account's Flask session and bearer tokens. Normal logout
does not transfer authority. A transfer code must not be reused as a permanent
login credential.

Notification creation accepts `{title, description, module_slug, audience,
recipient_ids?}`. Without explicit recipients, `audience` is `all`, `students`,
or `faculty`; explicit recipients must be active user IDs and can use
`audience: "selected"`. Notifications remain individual rows, retaining
per-recipient read state and the existing notification history behavior.
Notification records expose `created_by_id`, `originating_module`, `audience`,
`created_at`, and `is_read`.
