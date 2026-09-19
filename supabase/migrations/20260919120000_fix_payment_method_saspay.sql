-- Correctif : le formulaire d'abonnement envoie payment_method = 'saspay'
-- (voir src/routes/_authenticated/abonnement.tsx) depuis l'ajout du canal
-- SasPay, mais la contrainte posée dans la toute première migration ne
-- listait que 'orange_money' et 'moov_money'. Toute demande SasPay échouait
-- donc à l'insertion (violation de contrainte CHECK).

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_payment_method_check;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_payment_method_check
  CHECK (payment_method IN ('orange_money', 'moov_money', 'saspay'));
