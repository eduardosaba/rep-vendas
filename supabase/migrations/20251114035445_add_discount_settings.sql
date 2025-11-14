-- Add discount display settings to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS show_discount BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_old_price BOOLEAN DEFAULT true;