# Espace Admin complet pour LoyerAlert

Objectif : transformer l'espace admin actuel (6 pages) en un back-office complet, connecté aux vraies données, avec des actions réellement sécurisées côté base de données. Aucune fonctionnalité existante n'est supprimée.

## Ce qui existe déjà et sera conservé
- Dashboard admin, demandes de paiement, abonnements, utilisateurs, journal.
- Rôles `user` / `admin`, fonctions sécurisées côté base (`admin_stats`, `admin_users`, `admin_charts`, `review_payment_request`, `admin_set_suspended`), RLS sur toutes les tables.
- Parcours d'abonnement manuel + SasPay avec preuve de paiement.

## Nouveautés base de données (une seule migration)
- Niveaux d'administration : ajout des rôles `super_admin` et `moderator`, avec un compte Super Admin ayant tous les droits.
- Table des paramètres de la plateforme (nom, coordonnées, tarifs et durées des formules, réglages SasPay, mode maintenance, textes légaux) lisible par tous, modifiable par le Super Admin uniquement.
- Table des annonces/notifications admin (cible : tous, propriétaires, locataires ; type : annonce, maintenance, information) + lecture côté utilisateur.
- Table d'historique des alertes (rappels WhatsApp envoyés depuis l'app) avec destinataire, type, statut, date.
- Nouvelles fonctions sécurisées : statistiques étendues du tableau de bord, liste des logements de toute la plateforme, liste des abonnements avec jours restants, gestion des administrateurs (ajouter, changer de niveau, retirer), suppression d'un compte utilisateur, modification/suppression d'un logement, statistiques analytiques (revenus jour/semaine/mois, nouveaux utilisateurs, taux de renouvellement, alertes).
- Toutes ces fonctions vérifient le rôle côté base de données et écrivent une entrée dans le journal d'activité pour chaque action sensible.

## Pages admin (interface)
Barre latérale réorganisée : Tableau de bord, Utilisateurs, Logements, Abonnements, Paiements, Alertes, Statistiques, Notifications, Journal, Administrateurs, Paramètres.

1. **Tableau de bord** — 9 cartes chiffrées (utilisateurs, propriétaires, locataires, logements, abonnements actifs/expirés, paiements en attente, revenus, alertes), graphiques revenus (jour/semaine/mois commutables), évolution des utilisateurs, répartition des abonnements, plus activité récente, derniers paiements et dernières inscriptions.
2. **Utilisateurs** — recherche, filtres rôle/statut, tableau détaillé (inscription, dernière connexion, statut, type, formule, expiration, nombre de logements), fiche utilisateur, suspendre/réactiver, supprimer avec confirmation.
3. **Logements** — tous les logements avec propriétaire, locataire, localisation, loyer, date d'ajout, statut, prochaine échéance ; modification et suppression.
4. **Abonnements** — onglets actifs / expirés / en attente / historique, avec formule, prix, dates, jours restants ; changement de formule ou prolongation par l'admin.
5. **Paiements** — onglets tous / confirmés / en attente / refusés, montant, utilisateur, date, référence, formule, canal, preuve ; confirmer (active l'abonnement automatiquement) ou refuser avec motif, panneau de détails.
6. **Alertes** — compteurs envoyées / programmées / réussies / échouées et historique complet.
7. **Statistiques** — page analytique avec revenus par période, nouveaux utilisateurs, utilisateurs actifs, abonnements vendus, taux de renouvellement, logements, alertes, graphiques interactifs.
8. **Notifications** — composer et envoyer une annonce à tous / propriétaires / locataires, avec type (annonce, maintenance) et historique ; affichage côté utilisateur dans l'application.
9. **Journal** — qui, quoi, quand, sur qui, détails ; recherche et filtres.
10. **Administrateurs** — liste, ajout par e-mail, changement de niveau (Super Admin / Admin / Modérateur), désactivation, suppression — réservé au Super Admin.
11. **Paramètres** — identité de la marque, coordonnées, tarifs et durées des formules, réglages notifications et SasPay, textes légaux, mode maintenance.

## Sécurité
- Toutes les pages admin restent sous le gardien de routes existant, avec en plus un contrôle du niveau requis par page.
- Chaque action passe par une fonction base de données qui revérifie le rôle : un utilisateur normal ne peut ni lire ni exécuter quoi que ce soit d'administratif, même en appelant l'API directement.
- Confirmation obligatoire avant suppression, suspension, refus de paiement et activation du mode maintenance.

## Design
Même langage visuel que l'app (vert #087F5B, cartes, animations douces) : navigation latérale sombre, cartes statistiques, graphiques Recharts, tableaux avec recherche et filtres, modales de confirmation, squelettes de chargement, messages de succès/erreur. Responsive ordinateur / tablette / mobile. Aucun écran vide sans message ni bouton inactif.

## Page /abonnement
Vérification du parcours complet : bouton « Payer avec SasPay », section « Confirmer mon paiement » (date, référence, capture), puis revue admin et activation d'un mois calendaire.

## Détails techniques
- Une migration unique ajoutant les enums de rôles, les tables `platform_settings`, `admin_announcements`, `alert_logs`, et les fonctions `admin_*` en SECURITY DEFINER avec vérification de rôle et journalisation.
- Nouvelles routes sous `src/routes/_authenticated/admin.*.tsx`, hooks partagés dans `src/hooks/`, composants tableau/filtres réutilisables dans `src/components/admin/`.
- Aucune dépendance à Lovable dans le code applicatif ; Recharts et shadcn/ui déjà présents.
