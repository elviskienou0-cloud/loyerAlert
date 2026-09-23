# Loyer Facile

LOYERALERT — MICRO-SAAS DE SUIVI DES LOYERS AU BURKINA FASO

Construis une application SaaS appelée LoyerAlert.

Positionnement :

L'outil simple qui permet aux propriétaires de savoir qui a payé son loyer, qui est en retard et de relancer rapidement le locataire.

L'application doit rester extrêmement simple.

Elle ne doit PAS devenir :

une marketplace immobilière ;

un site d'annonces ;

un ERP immobilier ;

une plateforme de paiement ;

un outil juridique complexe.

Le cœur :

Logement → locataire → loyer → paiement → retard → relance WhatsApp.

1. CLIENTS CIBLES

propriétaires particuliers ;

propriétaires de chambres ;

propriétaires de studios ;

petits gestionnaires ;

petites résidences ;

petites agences.

Pays de lancement :

Burkina Faso

Devise :

FCFA

Langue :

français

2. AUTHENTIFICATION

Utiliser Supabase Auth.

Méthodes :

email + mot de passe ;

Google OAuth ;

récupération de mot de passe ;

déconnexion.

Google OAuth doit utiliser l'intégration officielle Supabase.

Gérer correctement :

callback ;

sessions ;

utilisateurs existants ;

comptes Google ;

absence de doublons ;

erreurs OAuth ;

production ;

développement.

Ne jamais exposer de secrets OAuth.

Ajouter une documentation claire de configuration Google Cloud + Supabase.

3. RÔLES

Créer :

user

admin

Tous les nouveaux comptes sont user.

L'admin doit être attribué uniquement de manière sécurisée depuis Supabase.

Un utilisateur ne doit jamais pouvoir devenir admin.

Protection contre :

modification du rôle ;

manipulation localStorage ;

modification d'une requête ;

accès direct à /admin.

4. DASHBOARD

Exemple :

LOYERALERT

Bonjour 👋

LOYERS DU MOIS

1 250 000 FCFA
Attendus

975 000 FCFA
Encaissés

275 000 FCFA
Impayés

────────────────

18 logements

15 🟢 payés
3 🔴 en retard

[Voir les retards]


5. LOGEMENTS

L'utilisateur peut ajouter :

nom/numéro du logement ;

adresse ;

montant du loyer ;

date d'échéance ;

description facultative.

Exemple :

Chambre 12

Loyer :
75 000 FCFA

Échéance :
05 de chaque mois


6. LOCATAIRES

Ajouter :

nom ;

téléphone ;

logement ;

date d'entrée ;

loyer ;

échéance.

Fiche :

IBRAHIM

Chambre 12

75 000 FCFA

Échéance :
05 août

🔴 En retard

[Relancer WhatsApp]


7. PAIEMENT DU LOYER

L'utilisateur doit pouvoir enregistrer manuellement un paiement.

Informations :

montant ;

date ;

moyen de paiement facultatif ;

note facultative.

Prévoir les paiements partiels.

Exemple :

Loyer :

75 000 F

Payé :

50 000 F

Reste :

25 000 F

8. STATUTS

Statuts automatiques :

upcoming

due

paid

partially_paid

overdue

Le statut doit être calculé de façon fiable côté backend/base de données.

Ne pas permettre au frontend de déclarer arbitrairement qu'un loyer est payé.

9. RAPPELS

Créer des rappels simples.

Avant échéance :

Bonjour [Nom], votre loyer de [Montant] FCFA arrive à échéance le [Date].

Jour de l'échéance :

Bonjour [Nom], votre loyer arrive à échéance aujourd'hui.

Après échéance :

Bonjour [Nom], votre loyer de [Montant] FCFA semble toujours impayé. Merci de régulariser.

Le propriétaire peut modifier le texte.

Le bouton doit permettre d'ouvrir WhatsApp.

Ne pas utiliser l'API WhatsApp Business au MVP.

10. HISTORIQUE

Pour chaque locataire :

loyers ;

paiements ;

dates ;

montants ;

soldes ;

retards.

Exemple :

JUILLET
75 000 F
🟢 Payé

AOÛT
75 000 F
🔴 Impayé

SEPTEMBRE
75 000 F
🟡 À venir


11. REÇU

Après enregistrement d'un paiement :

Permettre de générer un reçu simple.

Contenu :

propriétaire ;

locataire ;

logement ;

montant ;

date ;

période ;

référence.

PDF simple et professionnel.

12. STATISTIQUES

Afficher :

loyers attendus ;

loyers encaissés ;

impayés ;

nombre de logements ;

taux d'encaissement ;

nombre de locataires en retard.

Graphique simple.

Pas de comptabilité complexe.

13. ABONNEMENTS

GRATUIT

Maximum 3 logements.

STARTER

5 000 FCFA/mois

Maximum 10 logements.

PRO

2 500 FCFA/mois

Maximum 30 logements.

BUSINESS

5 000 FCFA/mois

Jusqu'à 100 logements.

Les limites doivent être contrôlées côté backend.

14. PAIEMENT MANUEL

Aucun paiement automatique.

Moyens disponibles :

Orange Money

04353163

Moov Money

70271810

Processus :

L'utilisateur sélectionne son abonnement.

Il choisit Orange Money ou Moov Money.

L'application affiche le numéro.

L'utilisateur effectue le transfert.

Il fait une capture d'écran.

Il indique le numéro utilisé.

Il peut saisir une référence.

Il téléverse la capture.

Statut = pending.

L'admin vérifie manuellement.

L'admin approuve ou refuse.

L'abonnement est activé uniquement après approbation.

Ne jamais activer automatiquement après l'envoi d'une capture.

15. PAYMENT REQUESTS

Créer une table :

payment_requests

Champs :

id ;

user_id ;

plan ;

amount ;

payment_method ;

sender_phone ;

transaction_reference ;

screenshot_path ;

status ;

created_at ;

reviewed_at ;

reviewed_by ;

rejection_reason.

Statuts :

pending

approved

rejected

16. CAPTURES DE PAIEMENT

Stockage :

Supabase Storage privé

Formats :

JPG ;

JPEG ;

PNG ;

WebP.

Limiter la taille.

Limiter les uploads.

Vérifier les types MIME.

Ne jamais rendre les captures publiques.

Un utilisateur ne peut accéder qu'à ses propres preuves de paiement.

L'admin peut consulter les preuves nécessaires à la validation.

17. ADMIN

Créer un espace :

/admin

Accessible uniquement aux administrateurs.

Dashboard :

LOYERALERT ADMIN

Utilisateurs
XXX

Logements suivis
XXX

Abonnements actifs
XXX

Paiements en attente
XXX

Revenus
XXX FCFA


Sections :

Utilisateurs

recherche ;

profil ;

abonnement ;

nombre de logements ;

suspension/réactivation.

Paiements

Afficher :

utilisateur ;

plan ;

montant ;

méthode ;

numéro ;

capture ;

date ;

statut.

Actions :

APPROUVER

REFUSER

Une raison doit être saisie lors d'un refus.

18. APPROBATION

Lorsqu'un admin approuve :

payment = approved ;

abonnement = actif ;

début = date de validation ;

expiration = date correspondante au plan ;

reviewed_by = admin ;

reviewed_at = date actuelle.

Lors d'un refus :

payment = rejected ;

abonnement non activé ;

raison enregistrée.

Ces opérations doivent être sécurisées et idéalement atomiques.

19. SÉCURITÉ SUPABASE

Activer RLS strictement.

Tables possibles :

profiles ;

properties ;

tenants ;

rent_records ;

rent_payments ;

subscriptions ;

payment_requests ;

activity_logs.

Chaque utilisateur doit uniquement voir ses propres :

logements ;

locataires ;

loyers ;

paiements ;

abonnements ;

demandes de paiement.

Les utilisateurs ne peuvent jamais modifier :

user_id ;

rôle ;

abonnement validé ;

statut de paiement admin ;

identité de l'administrateur.

Les données sensibles ne doivent pas être contrôlées uniquement avec le frontend.

20. SÉCURITÉ DES ADMINISTRATEURS

Ne jamais faire :

if (user.email === "...")


comme unique mécanisme de sécurité.

Utiliser un rôle sécurisé dans Supabase.

Créer une fonction sécurisée de vérification admin compatible avec RLS sans récursion.

Toutes les opérations administratives doivent être vérifiées côté serveur/base de données.

21. PROTECTION CONTRE LES ABUS

Prévoir :

validation serveur ;

rate limiting logique ;

protection des uploads ;

taille maximale des fichiers ;

protection des routes ;

sessions sécurisées ;

logs ;

gestion des erreurs ;

protection contre les doublons de paiement ;

protection contre la manipulation des abonnements.

Créer activity_logs.

Enregistrer :

connexion ;

ajout logement ;

ajout locataire ;

paiement enregistré ;

relance ;

demande d'abonnement ;

paiement approuvé ;

paiement refusé ;

suspension.

22. MOBILE-FIRST

L'application doit être conçue d'abord pour smartphone.

Navigation :

Dashboard ;

Logements ;

Locataires ;

Paiements ;

Abonnement ;

Profil.

Actions importantes visibles immédiatement.

23. FAIBLE CONNEXION

Optimiser pour le contexte mobile du Burkina Faso :

chargement rapide ;

compression images ;

skeleton loaders ;

retry ;

erreurs compréhensibles ;

éviter les requêtes inutiles ;

éviter les pages blanches ;

conservation temporaire des formulaires lorsque pertinent.

24. DESIGN

Style :

professionnel ;

moderne ;

rassurant ;

très lisible ;

minimaliste.

Le produit doit être compréhensible par une personne peu habituée aux logiciels professionnels.

25. EXPORTABILITÉ

Le projet doit être entièrement indépendant et auto-hébergeable (fait : ✅ plus aucune dépendance à Lovable).

Inclure :

code frontend ;

migrations SQL ;

RLS ;

fonctions backend ;

configuration Supabase ;

documentation ;

structure de base de données ;

fichiers nécessaires au déploiement.

Aucune dépendance critique cachée à un service tiers propriétaire.

Ne jamais mettre les secrets dans le code source.

26. QUALITÉ

Ne pas générer de fausses fonctionnalités.

Ne pas simuler les paiements.

Ne pas utiliser de données fictives en production.

Ne pas contourner les politiques RLS.

Ne pas stocker de secrets côté frontend.

Avant livraison, tester :

inscription ;

email/password ;

Google OAuth ;

récupération mot de passe ;

logements ;

locataires ;

loyers ;

paiements ;

paiements partiels ;

calcul des retards ;

WhatsApp ;

reçus PDF ;

abonnement ;

upload capture ;

validation admin ;

refus admin ;

RLS ;

accès direct aux données ;

responsive ;

mauvaise connexion.

Construis maintenant l'application complète.# SYSTÈME D'ESSAI GRATUIT ET D'ABONNEMENT — OBLIGATOIRE

Chaque nouvel utilisateur doit recevoir automatiquement une période d'essai GRATUITE de 30 jours à partir de la création de son compte.

Créer un système d'abonnement avec au minimum les statuts :

- trial

- active

- expired

- suspended

Lors de l'inscription :

subscription_status = "trial"

trial_started_at = date de création du compte

trial_ends_at = date de création + 30 jours

L'utilisateur doit pouvoir utiliser le SaaS pendant toute sa période d'essai.

IMPORTANT :

Le trial gratuit est accordé UNE SEULE FOIS par compte.

Ne jamais réinitialiser les 30 jours lorsque l'utilisateur :

- se déconnecte ;

- se reconnecte ;

- change d'appareil ;

- utilise Google ;

- utilise email/password.

Le système doit utiliser la date enregistrée en base de données et non une date stockée dans le navigateur.

# EXPIRATION AUTOMATIQUE

À chaque accès à une fonctionnalité protégée, le backend doit vérifier l'état réel de l'abonnement.

Si :

trial_ends_at <= current_timestamp

ET qu'aucun abonnement actif et validé n'existe :

subscription_status = "expired"

L'accès aux fonctionnalités payantes doit être automatiquement bloqué.

Cette vérification doit être effectuée côté serveur/base de données.

NE PAS se contenter d'une vérification JavaScript frontend.

Un utilisateur ne doit jamais pouvoir contourner l'expiration en modifiant :

- localStorage ;

- cookies ;

- paramètres URL ;

- JavaScript ;

- requêtes frontend ;

- données du navigateur.

# DONNÉES APRÈS EXPIRATION

NE JAMAIS supprimer les données de l'utilisateur lorsque son abonnement expire.

Conserver :

- compte ;

- profil ;

- données métier ;

- historique ;

- documents ;

- paiements ;

- statistiques historiques.

Après expiration, afficher une page :

"Votre période gratuite de 30 jours est terminée."

Puis :

"Pour continuer à utiliser [NOM DU SAAS], choisissez un abonnement."

Bouton :

[Choisir un abonnement]

Autoriser éventuellement l'utilisateur à consulter certaines données existantes en lecture seule, mais bloquer les fonctionnalités nécessitant un abonnement selon les règles du produit.

# PAIEMENT

Les paiements sont MANUELS.

Moyens de paiement :

Orange Money :

04353163

Moov Money :

70271810

Lorsqu'un utilisateur choisit un abonnement :

1. Afficher le prix.

2. Afficher les deux moyens de paiement.

3. L'utilisateur effectue le transfert.

4. L'utilisateur choisit Orange Money ou Moov Money.

5. L'utilisateur saisit le numéro ayant effectué le paiement.

6. L'utilisateur peut saisir une référence de transaction.

7. L'utilisateur téléverse obligatoirement une capture d'écran.

8. Créer une demande de paiement avec status = "pending".

9. NE PAS activer l'abonnement automatiquement.

# VALIDATION ADMINISTRATEUR

Seul l'administrateur peut confirmer le paiement.

Dans /admin :

Afficher toutes les demandes :

- utilisateur ;

- abonnement ;

- montant ;

- moyen de paiement ;

- numéro de paiement ;

- référence ;

- capture ;

- date ;

- statut.

Actions :

[APPROUVER]

[REFUSER]

Lors d'un refus, demander obligatoirement une raison.

# APPROBATION

Lorsque l'administrateur approuve :

payment_status = "approved"

subscription_status = "active"

subscription_started_at = date de validation

subscription_ends_at = date de validation + durée du plan

reviewed_by = admin_id

reviewed_at = current_timestamp

L'utilisateur retrouve immédiatement l'accès.

# REFUS

Lorsque l'administrateur refuse :

payment_status = "rejected"

subscription_status reste "expired" si le trial est terminé.

Ne jamais activer l'accès à la suite d'un paiement simplement déclaré par l'utilisateur.

# RENOUVELLEMENT

Pour un abonnement mensuel :

subscription_ends_at = date de validation + 30 jours.

Lorsque subscription_ends_at est dépassée :

si aucun renouvellement approuvé n'existe :

subscription_status = "expired"

Bloquer automatiquement les fonctionnalités payantes.

Le renouvellement ne doit être considéré comme valide qu'après confirmation manuelle par l'administrateur.

# SÉCURITÉ

Le statut réel de l'abonnement doit être contrôlé côté serveur.

Ne jamais faire confiance à :

- subscription_status envoyé par le frontend ;

- plan envoyé par le frontend ;

- user_id envoyé par le frontend ;

- prix envoyé par le frontend.

Le serveur doit récupérer l'utilisateur authentifié et déterminer lui-même :

- son abonnement ;

- son statut ;

- sa date d'expiration ;

- son plan ;

- les permissions associées.

Utiliser Supabase RLS et des fonctions backend sécurisées.

Un utilisateur ne peut jamais :

- modifier son abonnement ;

- prolonger son trial ;

- modifier sa date d'expiration ;

- modifier son statut ;

- s'attribuer un abonnement ;

- devenir admin.

# CAS GOOGLE OAUTH

Un utilisateur qui crée son compte avec Google doit recevoir exactement le même système de trial de 30 jours.

Ne jamais créer un nouveau trial simplement parce que l'utilisateur alterne entre :

- Google ;

- email/password.

Le profil et l'abonnement doivent rester liés au même compte utilisateur Supabase.

# EXPÉRIENCE UTILISATEUR

Dans le dashboard, afficher :

🎁 Essai gratuit

"Il vous reste X jours."

Lorsque l'essai arrive bientôt à expiration :

"Votre essai expire dans X jours."

Ajouter :

[S'abonner]

Lorsque le compte expire :

🔒 Abonnement expiré

"Votre période gratuite est terminée."

[Choisir un abonnement]

Lorsqu'un paiement est en attente :

🟡 Paiement en cours de vérification

"Votre paiement sera activé après vérification manuelle."

Lorsqu'il est approuvé :

🟢 Abonnement actif

"Votre abonnement est actif jusqu'au XX/XX/XXXX."

# TÂCHE CRITIQUE

Construire ce système de manière robuste côté backend/base de données.

Le frontend ne doit être qu'une représentation de l'état réel retourné par le backend.

Créer les tables, contraintes, politiques RLS, fonctions et logique nécessaires pour empêcher toute manipulation du système d'abonnement.

## Stack

- Frontend/SSR : React 19 + TanStack Start (TanStack Router + Vite)
- Base de données, auth, stockage et temps réel : [Supabase](https://supabase.com) (PostgreSQL)
- Aucune dépendance à un éditeur ou service tiers — projet 100% indépendant et exportable.

## Développement local

Prérequis : Node.js ≥ 20 (ou Bun) et un projet Supabase.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install          # ou: bun install
cp .env.example .env # puis renseignez vos identifiants Supabase
npm run dev           # démarre le serveur de dev sur http://localhost:8080
```

## Base de données Supabase

Toute la base de données (tables, RLS, fonctions, déclencheurs) est décrite dans
`supabase/migrations/`. Pour appliquer ces migrations sur votre propre projet
Supabase :

```sh
npx supabase login
npx supabase link --project-ref <votre-project-ref>
npx supabase db push
```

Un compartiment de stockage `payment-proofs` (privé) doit exister pour les
captures d'écran de paiement — voir `supabase/config.toml`.

## Build & déploiement

```sh
npm run build   # build de production dans .output/ (préréglage Node par défaut)
npm run preview
```

Le build utilise [Nitro](https://nitro.build) ; définissez la variable
d'environnement `NITRO_PRESET` (`node-server`, `cloudflare-module`, `vercel`,
`netlify`, …) pour cibler l'hébergeur de votre choix.
