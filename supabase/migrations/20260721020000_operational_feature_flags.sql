-- Migration: 20260721020000_operational_feature_flags.sql
-- Description: Adiciona colunas de configuração de faturamento e expedição na tabela organization_settings, além de uma coluna genérica de features_config para futuras expansões.

ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS auto_create_invoice_on_picking_completed BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS auto_create_shipment_on_invoice_issued BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS fiscal_mode TEXT DEFAULT 'manual' NOT NULL,
ADD COLUMN IF NOT EXISTS features_config JSONB DEFAULT '{
  "fulfillment": {
    "auto_create_invoice": true,
    "auto_create_shipment": true
  },
  "fiscal": {
    "mode": "manual"
  },
  "notifications": {
    "notify_customer_invoice": true,
    "notify_customer_shipment": true
  }
}'::jsonb NOT NULL;

-- Atualiza registros existentes para garantir dados coerentes
UPDATE public.organization_settings
SET features_config = '{
  "fulfillment": {
    "auto_create_invoice": true,
    "auto_create_shipment": true
  },
  "fiscal": {
    "mode": "manual"
  },
  "notifications": {
    "notify_customer_invoice": true,
    "notify_customer_shipment": true
  }
}'::jsonb
WHERE features_config IS NULL OR features_config = '{}'::jsonb;
