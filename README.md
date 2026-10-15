# Monevo

A manual, offline-first personal finance tracker.

- React + TypeScript + Vite
- Tailwind CSS with CSS-variable theme tokens (dark / light, runtime accent)
- Recharts for charts, Lucide for icons
- All data stored locally in the browser (localStorage)
- No bank sync, no crypto price feeds, no wallet connections, by design

## Setup

    npm install
    npm run dev        # http://localhost:5173
    npm run build      # production build into dist/
    npm run preview    # serve the built app
    npm run test       # unit tests (Vitest)
    npm run typecheck  # tsc --noEmit

## Status

Stage 0: scaffolding + theme tokens + fonts. The app shell, domain layer,
storage, onboarding, and features arrive in the following stages.