# Décisions — NeoTravel MVP

## 2026-06-24 — Socle Supabase sans dépendance client

- Le schéma SQL et les seeds sont fournis dans `supabase/`.
- `calculer_devis()` reste pur et ne lit/écrit pas Supabase.
- La table d'observabilité IA n'est pas créée en Sprint 1.
- `@supabase/supabase-js` n'est pas installé tant que le front/API Next.js n'en a pas besoin.
