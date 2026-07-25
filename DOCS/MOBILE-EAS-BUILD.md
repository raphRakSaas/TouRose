# Build APK / IPA — tester l’app mobile sur le cloud

Objectif : installer TouRose sur un téléphone Android **connecté à Supabase cloud** (pas au local `127.0.0.1`).

Outil : [EAS Build](https://docs.expo.dev/build/introduction/) (Expo Application Services).

---

## 1. Prérequis (une seule fois)

1. Compte Expo gratuit : [expo.dev/signup](https://expo.dev/signup)
2. EAS CLI (via le monorepo, pas besoin d’install globale) :

```bash
cd apps/mobile
pnpm eas --version
```

3. Connexion :

```bash
cd apps/mobile
pnpm eas login
```

4. Lier le projet :

```bash
pnpm eas init
```

Choisis de créer un projet EAS sur le compte Expo. Cela ajoute `extra.eas.projectId` dans `app.json`.

---

## 2. Variables d’environnement cloud (EAS)

Les variables `EXPO_PUBLIC_*` sont **inlinées au build**. Ne pas les mettre dans le repo.

Récupère depuis Supabase Dashboard → **Settings → API** :

- `EXPO_PUBLIC_SUPABASE_URL` → `https://<ref>.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → clé **anon** (publique)

Optionnel :

- `EXPO_PUBLIC_WEBSITE_ORIGIN` → `https://tourose.app` (liens de partage)
- `EXPO_PUBLIC_MAP_STYLE_URL` → URL style MapLibre si tu utilises la carte native

### Créer les variables pour le profil `preview`

```bash
cd apps/mobile

pnpm eas env:create --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://TON_REF.supabase.co" \
  --environment preview \
  --visibility plaintext

pnpm eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --environment preview \
  --visibility sensitive

pnpm eas env:create --name EXPO_PUBLIC_WEBSITE_ORIGIN \
  --value "https://tourose.app" \
  --environment preview \
  --visibility plaintext
```

Vérifier :

```bash
pnpm eas env:list --environment preview
```

---

## 3. Générer l’APK Android

```bash
cd apps/mobile
pnpm build:apk
```

Équivalent :

```bash
eas build --platform android --profile preview
```

- **APK** (pas AAB) → installable directement sur le téléphone
- Build dans le cloud Expo (~10–20 min)
- À la fin : **lien de téléchargement** + QR code dans le terminal / [expo.dev](https://expo.dev)

### Installer sur Android

1. Ouvre le lien de build sur ton téléphone
2. Télécharge l’APK
3. Autorise l’installation depuis sources inconnues si demandé
4. Ouvre TouRose → l’app pointe vers **Supabase cloud**

---

## 4. Profils EAS (`eas.json`)

| Profil | Usage | Sortie Android |
| --- | --- | --- |
| `preview` | Test interne cloud | **APK** |
| `preview-cloud` | Alias preview + canal OTA | **APK** |
| `development` | Dev client + Metro local | APK dev client |
| `production` | Store Play / App Store | AAB (Android) |

---

## 5. Stripe / deep links en test cloud

Le retour paiement utilise `tourose://support/success`. Vérifie dans Stripe Dashboard que la **success URL** de Checkout pointe bien vers ce schéma (déjà configuré côté Edge Function).

Webhook Stripe cloud :

`https://<ref>.supabase.co/functions/v1/stripe-webhook`

---

## 6. MCP Supabase (Cursor)

Pour inspecter la base cloud depuis Cursor (compter les événements, lire les logs, exécuter du SQL en lecture seule) :

1. Le fichier [`.cursor/mcp.json`](../.cursor/mcp.json) pointe vers le projet `jrdhguqvsykbmsxdepqc` en **read-only**.
2. **Cursor → Settings → Tools & MCP** : vérifier que `supabase` est connecté (OAuth au premier lancement).
3. Recharger la fenêtre si besoin (`Cmd+Shift+P` → *Reload Window*).
4. Exemple de prompt : « Combien d’événements publiés en cloud ? Utilise le MCP Supabase. »

Dashboard : [MCP connection](https://supabase.com/dashboard/project/jrdhguqvsykbmsxdepqc?showConnect=true&connectTab=mcp).

---

## 7. Dépannage

| Problème | Piste |
| --- | --- |
| Catalogue vide | 1) `pnpm eas env:list --environment preview` — URL + anon key présentes<br>2) Vérifier les données cloud (voir ci-dessous)<br>3) Rebuild APK après correction des variables |
| Données cloud absentes | `OPENAGENDA_CRON_ENABLED=true` + lancer **Actions → OpenAgenda cron → Run workflow**, ou en local :<br>`SUPABASE_URL=... SUPABASE_ANON_KEY=... IMPORT_CRON_SECRET=... pnpm import:openagenda:cloud` |
| Diagnostic rapide | `SUPABASE_URL=... SUPABASE_ANON_KEY=... pnpm check:cloud-catalog` (compte les événements via RPC) |
| « Supabase non configuré » | Rebuild après avoir ajouté les variables EAS ; clé anon = **anon / publishable** du dashboard (pas `replace-with`) |
| Filtre date trop strict | Sur l’écran Aujourd’hui, essayer **Quand → Tout** |
| Build échoue credentials Android | Laisser EAS générer un keystore (première fois) |
| Carte ne s’affiche pas | `EXPO_PUBLIC_MAP_STYLE_URL` manquant (optionnel) |
| Push notifications | Activer plus tard via EAS + `EXPO_PUBLIC_NOTIFICATIONS_ENABLED=true` |

---

## 8. Commandes utiles

```bash
# Liste des builds
pnpm eas build:list --platform android

# Voir les logs d’un build
pnpm eas build:view

# Rebuild après changement de variables
pnpm exec eas build --platform android --profile preview --clear-cache
```

Voir aussi : [`ENV-VARS.md`](./ENV-VARS.md), [`PRODUCTION-DEPLOY.md`](./PRODUCTION-DEPLOY.md).
