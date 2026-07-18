# Auth admin (JWT) et sécurité

Ce document explique **comment un administrateur est authentifié**, **comment donner un nouvel accès**, et **où en est la sécurité** (dont l’injection SQL).

---

## 1. Principe : le JWT porte le rôle, Postgres l’applique

```text
Login admin (email/mot de passe)
        │
        ▼
Supabase Auth renvoie un JWT
  app_metadata.role = "admin"   ← seul champ autoritatif pour le rôle
        │
        ▼
Chaque requête PostgREST / RPC envoie Authorization: Bearer <jwt>
        │
        ▼
Postgres : public.is_admin() lit auth.jwt() -> 'app_metadata' ->> 'role'
        │
        ├── true  → policies RLS écriture + RPC admin_save_* OK
        └── false → forbidden (même si l’UI Angular laisse passer)
```

### Code actuel

```sql
-- supabase/migrations/..._phase1_public_places_search_admin.sql
(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```

- **`app_metadata`** : modifiable **uniquement** avec la **service role** (serveur). Un utilisateur **ne peut pas** s’auto-promouvoir admin depuis le client.
- **`user_metadata`** : modifiable par l’utilisateur → **jamais** utiliser pour les droits admin.

L’écran Angular et le guard ne sont que de l’**UX**. La vraie porte, c’est **RLS + `is_admin()`** dans Postgres.

---

## 2. Se connecter en tant qu’admin (local)

1. `pnpm supabase:reset` (ou seed déjà appliqué)
2. `pnpm dev:up`
3. http://localhost:4200/login  
   - Email : `admin@tourose.local`  
   - Mot de passe : `tourose-admin-local` (**local Docker uniquement**)

Le seed place déjà `raw_app_meta_data.role = admin` sur cet utilisateur. Au login, le JWT contient ce claim.

Vérifier dans Studio → Authentication → user → **App Metadata** : `{ "role": "admin", ... }`.

---

## 3. Donner un **nouvel** accès admin

### Règle d’or

Ne jamais mettre la **service role** dans l’app admin Angular / mobile / site.  
La promotion se fait **hors client** (script local, Studio avec droits owner, ou Edge Function future protégée).

### Option A — Local : script du monorepo (recommandé en dev)

```bash
# L’utilisateur doit déjà exister dans Auth (signup Studio ou invite)
pnpm grant:admin -- --email toi@exemple.local
```

Le script :

1. lit l’URL + **service role locale** via `supabase status` ;
2. trouve l’utilisateur par e-mail ;
3. appelle `auth.admin.updateUserById(..., { app_metadata: { role: 'admin' } })` ;
4. l’utilisateur doit **se reconnecter** ou `refreshSession()` pour obtenir un JWT à jour.

### Option B — Studio (cloud ou local)

1. Authentication → Users → créer / sélectionner l’utilisateur  
2. **Raw App Meta Data** / App Metadata :

```json
{
  "role": "admin",
  "provider": "email",
  "providers": ["email"]
}
```

3. Enregistrer → l’utilisateur se reconnecte.

### Option C — Production (plus tard)

- Compte déjà créé (magic link / invite).  
- Depuis un poste sécurisé ou une Edge Function **réservée aux super-admins** :

```ts
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { role: 'admin' },
});
```

- Secrets : `SUPABASE_SERVICE_ROLE_KEY` uniquement en CI / vault / fonction serveur.  
- Après promotion : l’utilisateur **rafraîchit sa session**.

### Révoquer un admin

Même API avec `app_metadata: { role: 'user' }` (ou suppression de la clé `role`), puis invalidation / reconnexion.

---

## 4. Injection SQL et surface d’attaque

### Ce qui est déjà solide

| Zone | Pourquoi c’est OK |
| --- | --- |
| `admin_save_place` / `admin_save_event` | `INSERT ... VALUES ($vars)` — **pas** de SQL dynamique concaténé avec le texte utilisateur |
| Payload JSON | Valeurs lues via `payload ->> 'champ'` puis typées (`::uuid`, `::double precision`) |
| Contraintes CHECK | `place_type`, `status`, `price_type`, etc. rejettent les valeurs hors enum |
| Recherche `search_public_catalog` | `search_query` est un **paramètre** de fonction, pas interpolé dans une chaîne SQL exécutée |
| Clients (mobile/web/admin) | Supabase JS / PostgREST = requêtes paramétrées |
| Lecture publique | RLS : anon ne voit que `published` |

### Ce qui n’est **pas** une injection SQL mais reste un risque

| Risque | Mitigation actuelle / à faire |
| --- | --- |
| Contourner l’UI admin | Déjà bloqué par RLS si JWT sans `role=admin` |
| Vol de session admin | HTTPS prod, cookies/storage soignés, MFA plus tard |
| Fuite **service role** | Interdite dans les apps clientes (documenté) |
| Validation Zod côté client | Confort UX seulement — le serveur (contraintes + `is_admin`) fait foi |
| XSS dans l’admin | Angular échappe par défaut ; éviter `innerHTML` non sanitisé |
| Mass assignment | RPC n’accepte qu’un JSON contrôlé ; colonnes listées explicitement |

### Tests automatisés utiles

```bash
pnpm exec supabase test db
```

Inclut notamment : anon ne lit que le publié ; fonctions admin / search présentes.  
Des tests « non-admin → `admin_save_*` interdit » complètent la couverture (voir `supabase/tests/database/`).

---

## 5. Checklist sécurité admin (à cocher dans le backlog)

- [x] Rôle dans **`app_metadata`**, pas `user_metadata`
- [x] `is_admin()` + RLS sur écritures catalogue
- [x] RPC admin vérifient `is_admin()` avant écriture
- [x] Anon key seule dans l’admin client
- [ ] MFA recommandé pour comptes admin prod
- [ ] Edge Function « promote admin » protégée (au lieu de script manuel) en prod
- [ ] Rate limiting login / signalements
- [ ] Audit log des publications / promotions de rôle
- [ ] Revue périodique des users avec `role=admin`

---

## 6. FAQ rapide

**« Si je change mon rôle dans le localStorage Angular, je deviens admin ? »**  
Non. Postgres refuse l’écriture sans claim JWT valide.

**« Un utilisateur peut-il patcher son JWT pour mettre role=admin ? »**  
Non de façon utile : le JWT est signé par Auth ; sans la clé de signature, la modification est rejetée.

**« Où est le rôle dans le token ? »**  
Claim JSON : `app_metadata.role === "admin"` (aussi visible côté client après login pour l’UX uniquement).
