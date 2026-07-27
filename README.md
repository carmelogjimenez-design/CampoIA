# CAMPO 2.0 — React + TypeScript

Plataforma para coaches que desarrollan futbolistas.
Stack: Vite + React + TypeScript + Tailwind + Supabase.

## Cómo desplegar (GitHub + Vercel, sin instalar nada)

### 1. Subir a GitHub
Arrastra TODA esta carpeta al repositorio en github.com (respeta la estructura).

### 2. Variables de entorno en Vercel
En Vercel → tu proyecto → Settings → Environment Variables, añade:
- `VITE_SUPABASE_URL` = https://TU-PROYECTO.supabase.co
- `VITE_SUPABASE_KEY` = tu publishable key (sb_publishable_...)

### 3. Deploy
Vercel detecta Vite automáticamente. Framework Preset: Vite.
Build command: `npm run build` · Output: `dist`

## Estructura
- `src/types/database.ts` — tipos de todas las tablas (type-safety)
- `src/lib/supabase.ts` — cliente Supabase
- `src/context/AuthContext.tsx` — sesión y rol
- `src/pages/` — Login, CoachDashboard, PlayerPortal
- `src/App.tsx` — enruta según rol
