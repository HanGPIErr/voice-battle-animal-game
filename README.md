# Cri Animaux Arena

Jeu web multijoueur 1v1 où deux joueurs imitent des animaux au micro pour remplir leur barre avant l'adversaire.

## Lancer en local

```powershell
npm.cmd run dev
```

Puis ouvre `http://localhost:5176`.

## Stack gratuite

- Frontend: HTML/CSS/JavaScript sans build step.
- Backend: Node.js natif.
- Temps réel: WebSocket natif côté serveur.
- Base de données: SQLite via `node:sqlite`, stockée dans `data/game.sqlite`.
- Auth: sessions HTTP-only + mots de passe hashés avec PBKDF2.

Cette base peut être hébergée gratuitement sur une petite VM/free tier, ou migrée plus tard vers Supabase/Neon + un serveur WebSocket managé si besoin.

## Supabase sur Vercel

Vercel ne fournit pas de filesystem persistant pour SQLite. Pour préparer la base Supabase:

1. Ouvre Supabase depuis l'intégration Vercel.
2. Va dans SQL Editor.
3. Colle et exécute `supabase/schema.sql`.

Les variables Vercel attendues sont déjà créées par l'intégration Supabase, notamment `SUPABASE_POSTGRES_PRISMA_URL`, `SUPABASE_POSTGRES_URL`, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
