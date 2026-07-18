# Contribution

1. Lire `docs/README.md`, les specs numérotées et `docs/AGENTS.md`.
2. Travailler sur une branche courte et ciblée.
3. Respecter TypeScript strict, Zod aux frontières, et RLS côté Supabase.
4. Ajouter ou adapter les tests avec chaque règle métier.
5. Messages de commit conventionnels : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
6. Ne jamais committer de secret.
7. Pour un changement d’architecture, ajouter une ADR dans `docs/decisions/`.

## Vérifications avant PR

```bash
pnpm check
```
