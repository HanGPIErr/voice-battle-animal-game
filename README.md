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
