-- Add commission_rate to profiles and create commissions table
BEGIN;

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 5.00;

CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON public.profiles(commission_rate);

-- Commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON public.commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_id ON public.commissions(seller_id);

COMMIT;
