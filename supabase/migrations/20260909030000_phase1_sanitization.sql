-- Migration B: Data sanitization (To be executed ONLY after reviewing audit query results)
-- Description: Fix invalid price display settings rows where both are null, both true, or both false.

UPDATE public.settings
SET 
  show_sale_price = true,
  show_cost_price = false
WHERE show_sale_price IS NULL 
   OR show_cost_price IS NULL 
   OR (show_sale_price = true AND show_cost_price = true) 
   OR (show_sale_price = false AND show_cost_price = false);
