# LearnLoop Monorepo (Starter)

Stacks:
- Frontend: React + Vite + Tailwind + React Router
- Charts: Chart.js + react-chartjs-2
- Skill Map: React Flow
- Backend: Node + Express + MongoDB (Mongoose) + JWT (optional Firebase mode)
- Hosting: Vercel (frontend) / Render (backend)
- Version Control: GitHub

## Quickstart

```bash
# Install deps for both workspaces
npm install

# Dev (two terminals)
npm run dev:backend
npm run dev:frontend
```

### Environment

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.example` to `frontend/.env`

### Deploy
- Vercel: set root directory to `frontend`
- Render: set root directory to `backend`

See `backend/src/routes/auth.js` for JWT auth flow (and Firebase hook stubs).
