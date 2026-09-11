-- Migration C: Non-blocking constraint addition and validation
-- Description: Add NOT VALID constraint first, then validate after application rollout.

ALTER TABLE public.settings 
  DROP CONSTRAINT IF EXISTS check_settings_mutually_exclusive_price_display;

-- Step C.1: Add constraint as NOT VALID (does not lock table or block existing legacy rows during creation)
ALTER TABLE public.settings 
  ADD CONSTRAINT check_settings_mutually_exclusive_price_display 
  CHECK (
    (show_sale_price = true AND show_cost_price = false) OR 
    (show_sale_price = false AND show_cost_price = true)
  ) NOT VALID;

-- Step C.2: Validate constraint against sanitized rows
ALTER TABLE public.settings 
  VALIDATE CONSTRAINT check_settings_mutually_exclusive_price_display;

COMMENT ON CONSTRAINT check_settings_mutually_exclusive_price_display ON public.settings IS 
  'Enforces that exactly one of show_sale_price or show_cost_price is true at any time.';
