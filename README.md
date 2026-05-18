# Shopping Center POS

Point-of-sale system for a multi-tenant shopping center. Flask REST API backend, React (Vite) frontend, white and sharp blue theme.

## Features

- JWT authentication with roles: **admin**, **manager**, **cashier**
- Multi-shop tenancy (each shop has its own catalog and sales)
- **Advanced POS**: category filters, SKU scan, cash change calculator, recent sales, keyboard shortcuts (F2 search)
- **Admin analytics**: 7-day revenue chart, payment breakdown, trend vs yesterday, low-stock alerts
- **User management**: create staff via Admin → Users → **+ New user** (role cards, password confirm, 8+ char password)
- Managers can add cashiers/managers for their shop only
- Toast notifications, loading skeletons, polished split-panel login
- Sales reports with date filters and CSV export
- Stock tracking with automatic decrement on sale

## Prerequisites

- Python 3.10+
- Node.js 18+

## Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows — or cp on Unix

python init_db.py
python seed.py
python run.py
```

API runs at `http://127.0.0.1:5000`. Health check: `GET /api/health`.

### Optional: Flask-Migrate

```bash
set FLASK_APP=run:app
flask db init
flask db migrate -m "Initial"
flask db upgrade
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` to Flask.

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@pos.local | Admin123! | Admin (all shops) |
| manager1@pos.local | Manager123! | Manager (Tech Haven) |
| cashier1@pos.local | Cashier123! | Cashier (Tech Haven) |
| cashier2@pos.local | Cashier123! | Cashier (Style Corner) |

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Flask secret | dev value |
| `JWT_SECRET_KEY` | JWT signing key | dev value |
| `DATABASE_URL` | SQLAlchemy URI | SQLite `pos.db` |

## Role permissions

| Action | Admin | Manager | Cashier |
|--------|-------|---------|---------|
| POS checkout | Yes | Yes | Yes |
| View dashboard / reports | All shops | Own shop | No |
| Manage products | All shops | Own shop | No |
| Manage shops | Yes | No | No |
| Manage users | Yes | Own shop team | No |
| Create new users | Yes (all roles) | Yes (**cashier only** for own shop) | No |

## Project structure

```
backend/     Flask API, models, JWT auth, checkout service
frontend/    React SPA, admin panel, POS screen
```

## Production notes

- Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- Use PostgreSQL via `DATABASE_URL`
- Build frontend: `npm run build` and serve static files or deploy separately
- Enable HTTPS and secure cookie settings for tokens if using httpOnly cookies
