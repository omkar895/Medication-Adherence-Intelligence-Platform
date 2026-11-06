# Medication Adherence Intelligence Platform (MAIP)

A clinical ledger and adherence intelligence platform for chronic medication management, featuring honest outcome logging, transparent metrics, deterministic pattern insights, and server-enforced caregiver consent sharing.

---

## Architecture Overview

- **Backend**: FastAPI modular monolith with SQLAlchemy, SQLite/PostgreSQL, and JWT auth.
- **Frontend**: React + TypeScript + Vite PWA styled according to the *Clinical Ledger* design tokens (IBM Plex typography, explicit glyph+text statuses, and visible denominators).
- **Intelligence**: Deterministic Rule R1 pattern engine (no generative AI or causal speculation).
- **Safety**: Clinical safety guardrails preventing dose compensation, streak pressure, or unverified claims.

---

## Folder Structure

```
├── backend/
│   ├── app/
│   │   ├── core/         # Config, Database, Permissions, Security
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── modules/      # Routers (auth, medications, dose_events, reminders, analytics, caregivers, shared)
│   │   ├── schemas/      # Pydantic validation schemas
│   │   ├── services/     # Generator, Sweeper, Insights (R1), Seed script
│   │   └── main.py       # FastAPI application and static mount
│   └── tests/            # Pytest test suite (9 test suites)
├── web/
│   ├── src/
│   │   ├── components/   # Clinical UI (Ledger, ResponseDrawer, Insights, Caregivers, Disclaimers)
│   │   ├── services/     # API client and offline queue
│   │   ├── App.tsx       # Main navigation and state container
│   │   └── index.css     # Design tokens and styles
│   └── package.json
├── docs/                 # Product specifications, test plan, and decisions
├── start.py              # Unified startup script
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Install Backend Dependencies
```bash
pip install fastapi uvicorn sqlalchemy pytest passlib bcrypt pyjwt[crypto] httpx
```

### 2. Install Frontend Dependencies & Build Web App
```bash
cd web
npm install
npm run build
cd ..
```

---

## Running the Application

### Option A: Unified Server (API + Web UI on Port 8000)
```bash
python start.py
```
- **Web App**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### Option B: Frontend Hot-Reload Development Server
In a separate terminal:
```bash
cd web
npm run dev
```
- **Vite Dev Server**: [http://localhost:5173/](http://localhost:5173/) (proxies API requests to port 8000)

---

## Pre-Configured Demo Credentials

The platform automatically seeds synthetic chronic medication history (~6 weeks) on first launch. You can sign in using 1-click buttons on the login screen or with:

| Role | Email | Password | Seeded Data |
|---|---|---|---|
| **Patient** | `patient.demo@maip.local` | `Password123!` | 3 chronic medications, today's ledger, and active R1 insight |
| **Caregiver** | `caregiver.demo@maip.local` | `Password123!` | Linked via active scoped consent grant |

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./maip.db` | Database connection string (SQLite or PostgreSQL) |
| `SECRET_KEY` | *(built-in demo key)* | JWT signature secret |
| `INVITE_TTL_HOURS` | `168` (7 days) | Caregiver invitation expiration window |
| `SIMULATION_ENABLED` | `true` | Allows in-app reminder simulation |

---

## Running Tests

Run the complete test suite (unit, integration, caregiver scope authz, copy lint):

```powershell
$env:PYTHONPATH="."
python -m pytest backend/tests/test_all.py -v
```

---

## Clinical Safety Guardrails

1. **No compensatory dose advice**: Never advises how to make up missed doses.
2. **Status isolation**: `Taken` is distinct from `Delivered` or `Acknowledged`. Snooze changes reminder attempt timing only, never dose outcome.
3. **Transparent denominators**: All rates display $S, T, N, U$; when $S=0$, "No scheduled doses" is displayed.
4. **Immediate revocation**: Caregiver permissions are checked against the database on every request, ensuring instant revocation.
5. **Neutral copy**: Zero guilt or streak pressure; medical questions are directed to clinicians or pharmacists.

