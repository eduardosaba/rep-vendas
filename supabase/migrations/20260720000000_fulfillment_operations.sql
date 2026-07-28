-- Migration: 20260720000000_fulfillment_operations.sql
-- Description: Creates the Fulfillment bounded context tables (Pick Lists, Invoices, Shipments) and WMS tracking.

-- 0. Clean slate for new tables
DROP TABLE IF EXISTS public.pick_list_exceptions CASCADE;
DROP TABLE IF EXISTS public.pick_list_items CASCADE;
DROP TABLE IF EXISTS public.pick_lists CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.shipments CASCADE;

-- 1. Pick Lists (Capa da Separação Física)
CREATE TABLE IF NOT EXISTS public.pick_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_from_event UUID REFERENCES public.order_events(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'CREATED' NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_pick_list_status_enum CHECK (
        status IN ('CREATED', 'ASSIGNED', 'PICKING', 'CHECKING', 'COMPLETED', 'BLOCKED', 'CANCELLED')
    )
);

CREATE INDEX IF NOT EXISTS idx_pick_lists_order ON public.pick_lists(order_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_org ON public.pick_lists(organization_id);

-- 2. Pick List Items (Itens com Snapshot Físico)
CREATE TABLE IF NOT EXISTS public.pick_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID REFERENCES public.pick_lists(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    
    -- Snapshots físicos imutáveis
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT,
    color_snapshot TEXT,
    size_snapshot TEXT,
    
    quantity_requested INTEGER NOT NULL,
    quantity_picked INTEGER DEFAULT 0 NOT NULL,
    location_code TEXT,
    
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_pick_list_item_status_enum CHECK (
        status IN ('pending', 'picked', 'missing')
    )
);

CREATE INDEX IF NOT EXISTS idx_pick_list_items_parent ON public.pick_list_items(pick_list_id);

-- 3. Pick List Exceptions (Divergências de Estoque)
CREATE TABLE IF NOT EXISTS public.pick_list_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID REFERENCES public.pick_lists(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_pick_list_exception_type_enum CHECK (
        type IN ('MISSING_STOCK', 'DAMAGED', 'WRONG_ITEM', 'OTHER')
    )
);

-- 4. Invoices (Faturamento)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT DEFAULT 'invoice' NOT NULL,
    invoice_number TEXT,
    series TEXT,
    access_key TEXT,
    status TEXT DEFAULT 'draft' NOT NULL,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_invoice_status_enum CHECK (
        status IN ('draft', 'issued', 'cancelled')
    )
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);

-- 5. Shipments (Expedição Logística)
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    carrier_name TEXT,
    tracking_code TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_shipment_status_enum CHECK (
        status IN ('pending', 'packed', 'shipped', 'delivered', 'returned')
    )
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);

-- 6. RLS Policies Multi-Tenant seguras (Filtrando por organization_id ou via orders)
ALTER TABLE public.pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Pick Lists Policy
CREATE POLICY "Tenant Pick Lists" ON public.pick_lists FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- Pick List Items Policy (via JOIN parent)
CREATE POLICY "Tenant Pick List Items" ON public.pick_list_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.pick_lists pl
        WHERE pl.id = pick_list_items.pick_list_id
        AND (
            pl.organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
        )
    )
);

-- Exceptions Policy
CREATE POLICY "Tenant Pick List Exceptions" ON public.pick_list_exceptions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.pick_lists pl
        WHERE pl.id = pick_list_exceptions.pick_list_id
        AND (
            pl.organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
        )
    )
);

-- Invoices Policy
CREATE POLICY "Tenant Invoices" ON public.invoices FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- Shipments Policy
CREATE POLICY "Tenant Shipments" ON public.shipments FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);
