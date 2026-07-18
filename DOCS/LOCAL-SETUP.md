# Configuration locale

## 1. Outils

1. Installer Node 22+
2. Activer pnpm via Corepack
3. Installer et démarrer Docker Desktop
4. `pnpm install` à la racine

## 2. Variables d’environnement

Copier pour chaque app :

- `apps/mobile/.env.example` → `apps/mobile/.env`
- `apps/website/.env.example` → `apps/website/.env`
- `apps/admin/.env.example` → `apps/admin/.env`

Remplir les clés anon Supabase depuis `pnpm supabase:status` après démarrage.

## 3. Supabase

Voir `SUPABASE-LOCAL.md`.

## 4. Applications

```bash
pnpm dev:mobile
pnpm dev:website
pnpm dev:admin
```

Le mobile est prévu en **development build** (`expo-dev-client`), pas uniquement Expo Go. MapLibre et notifications nécessiteront une build native EAS.

## 5. Qualité

```bash
pnpm check
```
