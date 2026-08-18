# LoyerAlert — Documentation

Micro-SaaS de suivi des loyers (Burkina Faso, FCFA, français).

## Stack
- Frontend : TanStack Start (React 19, Vite, Tailwind v4)
- Backend : Supabase (Postgres + Auth + Storage), migrations dans `supabase/migrations/`

## Base de données
Tables : `profiles`, `user_roles`, `subscriptions`, `properties`, `tenants`,
`rent_records`, `rent_payments`, `payment_requests`, `activity_logs`.
Vue `rent_status_view` : calcule côté base le montant payé, le solde et le statut
(`upcoming`, `due`, `paid`, `partially_paid`, `overdue`). Le frontend ne peut jamais
déclarer un loyer payé.

Fonctions sécurisées (SECURITY DEFINER, `search_path = public`) :
- `has_role`, `is_admin` — rôles sans récursion RLS
- `effective_status`, `has_access`, `plan_limit` — état réel de l'abonnement (non exposées au client)
- `my_account()` — état de l'abonnement de l'utilisateur connecté
- `generate_rent_records(date)` — génère les loyers du mois
- `review_payment_request(id, approve, reason)` — validation admin atomique
- `admin_set_suspended`, `admin_stats`, `admin_users` — réservées aux admins

RLS activée partout : chaque utilisateur ne voit que ses propres données ;
`user_id`, rôle, statut d'abonnement et champs de validation admin ne sont pas modifiables
par l'utilisateur (aucune policy UPDATE côté client sur `subscriptions` / `payment_requests`).

Limites de logements appliquées par le trigger `properties_limit` (essai : 30,
gratuit/expiré : 3, starter : 10, pro : 30, business : 100).

## Essai gratuit
Le trigger `on_auth_user_created` crée le profil, le rôle `user` et un abonnement
`trial` de 30 jours (dates en base, jamais dans le navigateur). L'essai est unique par
compte, y compris via Google. À l'expiration, `effective_status` renvoie `expired` et
les fonctionnalités payantes sont bloquées côté base. Aucune donnée n'est supprimée.

## Authentification
Email/mot de passe, Google (OAuth géré côté plateforme), réinitialisation via
`/reset-password`, déconnexion avec purge du cache. Aucun secret OAuth dans le code.
Pour utiliser vos propres identifiants Google : créez un client OAuth « Application Web »
dans Google Cloud, ajoutez l'URL de callback fournie dans les réglages d'authentification
du backend, puis collez-y le Client ID et le Client Secret.

## Rôle admin
Attribué uniquement en base :
```sql
insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');
```
Aucune action côté client ne peut accorder le rôle admin ; toutes les opérations
administratives revérifient le rôle en base.

## Paiement des abonnements
Manuel : Orange Money 04353163 / Moov Money 70271810. L'utilisateur téléverse une capture
(JPG/PNG/WebP, 3 Mo max) dans le bucket privé `payment-proofs` (`<user_id>/<fichier>`),
crée une demande `pending` (une seule à la fois), puis un admin approuve ou refuse
(raison obligatoire). L'abonnement n'est activé qu'après approbation, pour 30 jours.

## Exportabilité
Le code frontend, les migrations SQL (RLS incluses) et cette documentation suffisent à
redéployer le projet sur n'importe quel hébergeur avec un projet Supabase.
Les clés sont fournies par variables d'environnement, jamais dans le code.
