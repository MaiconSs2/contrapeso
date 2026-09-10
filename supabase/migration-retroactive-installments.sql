-- Contrapeso: suporte a compras parceladas retroativas
-- Execute uma vez no Supabase SQL Editor.
-- As parcelas já pagas ficam fora das faturas, saídas e limite comprometido.
ALTER TABLE public.card_purchases
  ADD COLUMN IF NOT EXISTS paid_installments integer NOT NULL DEFAULT 0;

ALTER TABLE public.card_purchases
  DROP CONSTRAINT IF EXISTS card_purchases_paid_installments_check;

ALTER TABLE public.card_purchases
  ADD CONSTRAINT card_purchases_paid_installments_check
  CHECK (paid_installments >= 0 AND paid_installments <= installments);
