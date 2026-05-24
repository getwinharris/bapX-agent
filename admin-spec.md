# bapX Admin Panel — Specification

## Overview
Admin panel for the CEO to manage bapX platform. Separate from user dashboard. Accessible at `/admin` with super-admin JWT auth.

## Architecture

### Admin Auth
- Super-admin user seeded in DB with `is_admin=1` role
- Admin login via `/api/admin/login` — returns admin JWT with elevated permissions
- Admin JWT checked via `Depends(get_admin_user)` middleware on all admin routes

### Global Admin Config Table
Stored in SQLite `admin_config` table:
```sql
CREATE TABLE IF NOT EXISTS admin_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
```
Pre-seeded keys:
- `stripe_secret_key` — Stripe API secret key
- `stripe_webhook_secret` — Stripe webhook signing secret
- `google_oauth_client_id` — Google OAuth client ID
- `google_oauth_client_secret` — Google OAuth client secret
- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass` — Mail server config
- `admin_email` — Admin notification email
- `billing_plan_base_price` — Default $5
- `billing_storage_price_per_gb` — Default $1

### Mail Inbox
For receiving noreply / admin emails. Store in `admin_mail` table:
```sql
CREATE TABLE IF NOT EXISTS admin_mail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_addr TEXT NOT NULL,
    to_addr TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    read INTEGER DEFAULT 0,
    received_at TEXT DEFAULT (datetime('now'))
);
```

### Notifications Table
```sql
CREATE TABLE IF NOT EXISTS admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,  -- 'user_signup', 'payment_failed', 'abuse_detected', 'server_issue', 'sandbox_error'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',  -- 'info', 'warning', 'critical'
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/login | Login with admin creds (email + password + is_admin check) |
| POST | /api/admin/logout | Invalidate admin session |

### Dashboard / Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/stats | Platform stats: total users, active users, total sandboxes, total revenue, storage used, signups today |

### User Management
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/users | List all users (paginated, searchable by email/username) |
| GET | /api/admin/users/{id} | Get user details + sandbox info + usage stats |
| POST | /api/admin/users/{id}/ban | Ban user — clears their sandbox, marks account banned |
| POST | /api/admin/users/{id}/unban | Unban user |
| POST | /api/admin/users/{id}/clear-sandbox | Destroy and recreate user's sandbox |
| DELETE | /api/admin/users/{id} | Delete user + all data + sandbox |

### Billing
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/billing/overview | MRR, active subs, churn rate, total revenue |
| GET | /api/admin/billing/transactions | Recent payments/charges |
| POST | /api/admin/billing/refund/{user_id} | Issue refund to user |

### Config / Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/config | Get all admin config keys (values masked for secrets) |
| POST | /api/admin/config | Save/update a config key-value pair |
| POST | /api/admin/config/stripe/test | Test Stripe API key by making a test API call |
| POST | /api/admin/config/oauth/test | Test Google OAuth credentials |

### Mail
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/mail | List received emails |
| GET | /api/admin/mail/{id} | Get email body |
| POST | /api/admin/mail/{id}/read | Mark as read |
| DELETE | /api/admin/mail/{id} | Delete email |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/notifications | List notifications (unread first) |
| POST | /api/admin/notifications/{id}/read | Mark notification read |
| POST | /api/admin/notifications/read-all | Mark all read |
| DELETE | /api/admin/notifications/{id} | Delete notification |

### Automation
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/automation/cleanup-banned | Clear all banned users' sandboxes + data |
| POST | /api/admin/automation/clear-cache | Clear platform caches |
| GET | /api/admin/automation/logs | View automation job logs |

## Frontend — Admin Dashboard Page

A single `/static/admin.html` page. Pure HTML/CSS/JS, no React.

### Layout
- **Login screen** — email + password admin login form
- **Sidebar** with sections:
  - 📊 Dashboard (stats overview)
  - 👥 Users (user list + management)
  - 💳 Billing (revenue + transactions)
  - ⚙️ Settings (API keys, OAuth creds, SMTP config)
  - 📬 Mail (inbox)
  - 🔔 Notifications (bell icon with badge)
  - 🤖 Automation (cleanup tools + logs)

### User Management Page
- Searchable table: Username | Email | Plan | Storage | Status | Actions
- Actions dropdown: View Details | Ban/Unban | Clear Sandbox | Delete
- Click row → user detail panel with full info

### Settings Page
- Stripe section: secret key input (masked), webhook secret, test button
- Google OAuth section: client ID, client secret (masked), test button
- SMTP section: host, port, user, pass (masked)
- Billing section: base price, storage price per GB
- Save button per section

### Notifications
- Bell icon in top bar with unread count badge
- Dropdown showing latest 5 notifications
- Click → full notification page
- Severity color: info=blue, warning=yellow, critical=red

## Admin User Seeding
On backend startup, if no admin user exists, create one:
- username: `admin`
- email: `admin@bapx.in`
- password: read from env `BAPX_ADMIN_PASSWORD` or default `admin123` (must be changed)

## Files to Create/Modify

### Backend files:
- `/root/Dev/bapx/backend.py` — Add all admin endpoints + admin auth middleware
- `/root/Dev/bapx/main.py` — No changes needed (re-exports)

### Frontend file:
- `/root/Dev/bapx/static/admin.html` — New admin dashboard SPA

## Constraints
- Pure Python FastAPI backend
- Pure vanilla HTML/CSS/JS frontend, no frameworks
- Dark theme matching existing dashboard
- All admin endpoints require admin JWT auth
- API keys/credentials stored encrypted in DB (at minimum env var fallback)
- Never expose full API keys in GET responses — mask them
- Git commit after completion
