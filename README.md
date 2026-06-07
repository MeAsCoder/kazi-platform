# Kazi Connect — Full Platform

A 3-role marketplace matching Kenyan informal workers to jobs, with a real database and
auth. The trained ML model predicts the trade from a free-text request; Next.js owns the
data and the ranking.

```
Browser (worker / client / admin UIs)
      │
Next.js + Prisma  ──►  PostgreSQL (Neon)        users, profiles, jobs, matches, reviews, flags
      │
      └──HTTP──►  FastAPI model service          predicts the trade only (the sole Python)
```

## Repo layout
```
kazi-platform/
├── model-service/        FastAPI — wraps your trained trade_classifier.joblib
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── web/                  Next.js 14 (App Router) + Prisma + Auth.js
    ├── prisma/schema.prisma
    ├── lib/{prisma,auth,matching}.ts
    ├── middleware.ts                role-based route protection
    ├── app/api/{auth,register,match}/...
    └── package.json
```

## What's built (Phase 1 — backbone)
- **Model service**: `/predict-trade` and `/health`, tested. Loads your trained artifact
  (`TRADE_MODEL_PATH`) or trains a synthetic fallback so it always boots.
- **Database schema**: User (+Role enum WORKER/CLIENT/ADMIN), WorkerProfile, Job, Match,
  Review, FraudFlag.
- **Auth**: Auth.js credentials login, role stored in the JWT/session.
- **Route protection**: `middleware.ts` guards `/worker`, `/client`, `/admin`.
- **APIs**: `POST /api/register` (worker/client signup), `POST /api/match` (client posts a
  job → trade predicted → workers ranked from the DB → matches saved).
- **Ranking**: `lib/matching.ts` — calls the model service, then scores workers by
  skill + distance (Haversine) + rating + job history.

## Phase 2 — the UIs (built)
- **Landing** (`/`) — hero, how-it-works, CTAs.
- **Auth** — `/register` with a Client/Worker role toggle (worker shows trade, skills, rate,
  availability), `/login`, and `/dashboard` which forwards each role to its area.
- **Worker** (`/worker`) — profile card, availability toggle, job-completion stats, and the
  list of jobs they were matched to.
- **Client** (`/client`) — post a job, see the predicted trade (with a "be more specific"
  prompt when ambiguous), ranked workers with an explainable breakdown, WhatsApp + rating.
- **Admin** (`/admin`) — stat tiles, fraud-flag review (resolve/dismiss), a "run fraud scan"
  button (flags duplicate phones / cloned profiles), and user moderation (ban/unban).
- Styled with Tailwind: acacia-green + clay accents on warm paper, Bricolage Grotesque +
  Hanken Grotesk fonts.

### Seed data + demo logins
`npm run db:seed` creates an admin, 2 clients and 16 workers (2 per trade). All passwords
are `password123`:
- **Admin** — phone `+254700000000`
- **Client** — phone `+254711000001`
- Workers exist so the client's "Find workers" returns ranked matches immediately.

To promote any account to admin manually: `npx prisma studio` -> edit the user's `role`.

## Setup

### 1. Model service
```bash
cd model-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# optional: copy your trained model here so it's used instead of the fallback
#   copy ..\..\kazi-connect\artifacts\trade_classifier.joblib .
uvicorn main:app --reload --port 8000
# test:  curl -X POST localhost:8000/predict-trade -H "Content-Type: application/json" -d "{\"text\":\"leaking pipe in Kasarani\"}"
```

### 2. Database (Neon) + web app
```bash
cd web
npm install
cp .env.example .env            # fill in Neon DATABASE_URL/DIRECT_URL, AUTH_SECRET, MODEL_SERVICE_URL
npx prisma migrate dev --name init   # creates the tables
npm run db:seed                      # demo admin, clients, workers (password123)
npm run dev                     # http://localhost:3000
```
Generate `AUTH_SECRET` with `npx auth secret`. Get the two Neon connection strings from the
Neon dashboard (pooled → DATABASE_URL, unpooled → DIRECT_URL).

## Deploy
- **Model service → Render** (or Railway/Fly): new Web Service from the `model-service`
  folder, it builds the Dockerfile. Set `ALLOWED_ORIGINS` to your Vercel URL. Copy the
  public URL.
- **Web → Vercel**: import the `web` folder, add the same env vars (with
  `MODEL_SERVICE_URL` = the Render URL), deploy. Run `prisma migrate deploy` via the build
  or once locally against the prod DB.

## How the wiring works (for your report)
The browser never talks to Python directly. A client posts a job → the Next.js server route
calls the FastAPI service to get the predicted trade → it queries Postgres for available
workers of that trade → scores and ranks them in TypeScript → returns the top 5 with an
explainable per-factor breakdown, and stores the matches. The ML stays isolated in one small
Python service; everything else is the Next.js/Postgres stack.
