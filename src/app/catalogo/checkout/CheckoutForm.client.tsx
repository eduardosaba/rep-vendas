'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import OrderReview from '@/components/rep/OrderReview';

export default function CheckoutForm({
  companyId,
  repId,
  repSlug,
  productId,
  initialTheme,
  initialProduct,
  initialRep,
  checkoutBlocked,
  initialCustomerId,
  initialCustomer,
  isDirectSale,
  companyBrand,
}: {
  companyId?: string;
  repId?: string;
  repSlug?: string;
  productId?: string;
  initialTheme?: any;
  initialProduct?: any;
  initialRep?: any;
  checkoutBlocked?: boolean;
  initialCustomerId?: string | null;
  initialCustomer?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
  } | null;
  isDirectSale?: boolean;
  companyBrand?: {
    id?: string | null;
    name?: string | null;
    logo_url?: string | null;
    slug?: string | null;
  } | null;
}) {
  const isCustomerLinked = Boolean(initialCustomerId);
  const isPresentialDirectSale = Boolean(isDirectSale);
  const [mode, setMode] = useState<'select' | 'new'>(repId ? 'select' : 'new');
  const [name, setName] = useState(initialCustomer?.name || '');
  const [phone, setPhone] = useState(initialCustomer?.phone || '');
  const [email, setEmail] = useState(initialCustomer?.email || '');
  const [cnpj, setCnpj] = useState(initialCustomer?.document || '');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'review' | 'receipt'>('form');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [resolvedRep, setResolvedRep] = useState<any>(initialRep || null);
  const [theme, setTheme] = useState<any>(initialTheme || null);
  const [product, setProduct] = useState<any>(initialProduct || null);
  const [paymentLabel, setPaymentLabel] = useState('Boleto 30/60/90 Dias');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const effectiveRepId = repId || resolvedRep?.id || null;
  const effectiveCompanyId = companyId || resolvedRep?.company_id || null;
  const cartItems = productId
    ? [
        {
          id: productId,
          quantity: 1,
          name: product?.name || 'Produto',
          brand: product?.brand || null,
          price: Number(product?.price || 0),
          image_url: product?.image_url || product?.external_image_url || null,
        },
      ]
    : [];

  useEffect(() => {
    if (!isCustomerLinked) return;
    setMode('select');
    setSelectedCustomerId(initialCustomerId || null);
    setName(initialCustomer?.name || '');
    setPhone(initialCustomer?.phone || '');
    setEmail(initialCustomer?.email || '');
    setCnpj(initialCustomer?.document || '');
  }, [isCustomerLinked, initialCustomerId, initialCustomer]);

  useEffect(() => {
    const slugFromUrl = repSlug || searchParams?.get?.('venda') || searchParams?.get?.('rep');
    if (!slugFromUrl) return;
    (async () => {
      try {
        const res = await fetch(`/api/rep/by-slug?slug=${encodeURIComponent(slugFromUrl)}`);
        const json = await res.json();
        if (json?.success && json?.data?.id) {
          (window as any).__resolvedRep = json.data;
          setResolvedRep(json.data);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [searchParams, repSlug]);

  useEffect(() => {
    if (!effectiveCompanyId || theme) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/company/settings');
        const json = await res.json();
        if (json?.success) setTheme(json.data || null);
      } catch {
        // ignore, fallback visual continua
      }
    })();
  }, [effectiveCompanyId, theme]);

  useEffect(() => {
    if (!productId || product) return;
    const ownerId = effectiveRepId || effectiveCompanyId;
    if (!ownerId) return;
    (async () => {
      try {
        const res = await fetch(`/api/products?userId=${encodeURIComponent(ownerId)}&ids=${encodeURIComponent(productId)}&limit=1`);
        const json = await res.json();
        const item = (json?.data && json.data[0]) || null;
        if (item) setProduct(item);
      } catch {
        // ignore
      }
    })();
  }, [productId, product, effectiveRepId, effectiveCompanyId]);

  const submitOrder = async (review?: { includeSignature: boolean; signatureDataUrl: string | null; paymentLabel: string; discountPercent: number }) => {
    if (checkoutBlocked) {
      toast.error('Novos pedidos estao temporariamente bloqueados pela distribuidora.');
      return;
    }
    setLoading(true);
    try {
      let signatureUrl: string | null = null;
      if (review?.includeSignature && review.signatureDataUrl) {
        const uploadRes = await fetch('/api/rep/upload-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: review.signatureDataUrl,
            companyId: effectiveCompanyId,
            repId: effectiveRepId,
          }),
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson?.success) {
          toast.error('Não foi possível salvar a assinatura.');
          setLoading(false);
          return;
        }
        signatureUrl = uploadJson.url;
      }

      const payload: any = {
        storeOwnerId: effectiveRepId || effectiveCompanyId,
        ownerIsCompany: !effectiveRepId && !!effectiveCompanyId,
        source: isPresentialDirectSale ? 'crm_direct_sale' : effectiveRepId ? 'rep' : 'catalogo',
        customer: { name, phone, email, cnpj },
        cartItems,
        sellerId: effectiveRepId || undefined,
        review: {
          paymentLabel: review?.paymentLabel || paymentLabel,
          discountPercent: Number(review?.discountPercent ?? discountPercent) || 0,
          signatureUrl,
          signedAt: signatureUrl ? new Date().toISOString() : null,
          device: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          ipLocation: 'N/A',
          originTag: isPresentialDirectSale ? 'crm_direct_sale' : 'public_catalog',
        },
      };

      // se representante selecionou cliente já cadastrado
      if (effectiveRepId && mode === 'select' && selectedCustomerId) {
        payload.existingCustomerId = selectedCustomerId;
      }

      // se representante está cadastrando cliente novo no ponto de venda
      if (effectiveRepId && mode === 'new') {
        payload.pendingCustomerApproval = true;
      }

      const res = await fetch('/api/create-order', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data?.success) {
        toast.success('Pedido criado com sucesso');
        const newOrderId = String(data?.orderUuid || data?.orderId || '');
        const companySlug = String(companyBrand?.slug || '').trim();
        const representativeSlug = String(repSlug || resolvedRep?.slug || '').trim();

        if (companySlug && representativeSlug && newOrderId) {
          router.push(`/catalogo/${companySlug}/${representativeSlug}/sucesso?id=${encodeURIComponent(newOrderId)}`);
        } else if (representativeSlug && newOrderId) {
          router.push(`/catalogo/${representativeSlug}/sucesso?id=${encodeURIComponent(newOrderId)}`);
        } else if (isPresentialDirectSale) {
          router.push('/admin/distribuidora/pedidos');
        } else {
          router.push('/admin/distribuidora/pedidos');
        }
      } else {
        toast.error('Erro ao criar pedido: ' + (data?.error || data?.message || ''));
      }
    } catch (err: any) {
      toast.error('Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Preencha os dados do cliente antes de avançar.');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Não há itens no pedido.');
      return;
    }
    setStep('review');
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!effectiveRepId || term.trim().length < 2) return setCustomerOptions([]);
    try {
      const res = await fetch(`/api/rep/customers?q=${encodeURIComponent(term)}`);
      const json = await res.json();
      if (json?.success) setCustomerOptions(json.data || []);
    } catch (e) {
      // ignore
    }
  };

  if (step === 'review') {
    return (
      <OrderReview
        cart={cartItems}
        customer={{ name }}
        settings={theme || { primary_color: '#0F172A', font_family: 'font-sans' }}
        paymentLabel={paymentLabel}
        discountPercent={discountPercent}
        submitting={loading}
        onSubmit={submitOrder}
        onGoCustomers={() => router.push('/dashboard/clients')}
        onGoPaidOrders={() => router.push('/rep/pedidos?status=paid')}
        isDirectSale={isPresentialDirectSale}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      {checkoutBlocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Novos pedidos estao bloqueados para este catalogo no momento. Fale com seu representante.
        </div>
      ) : null}

      {isCustomerLinked && initialCustomer ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Cliente vinculado: <strong>{initialCustomer.name || 'Cliente selecionado'}</strong>
        </div>
      ) : null}

      {effectiveRepId && !isCustomerLinked ? (
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-2">
          <button type="button" onClick={() => setMode('select')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${mode === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
            Cliente da Base
          </button>
          <button type="button" onClick={() => setMode('new')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${mode === 'new' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
            Novo Cliente (Pré-cadastro)
          </button>
        </div>
      ) : null}

      {effectiveRepId && mode === 'select' && !isCustomerLinked ? (
        <div>
          <label className="block text-sm">Buscar cliente</label>
          <input value={searchTerm} onChange={(e) => handleSearch(e.target.value)} placeholder="Nome, CNPJ ou telefone" className="w-full border rounded px-2 py-1" />
          <div className="mt-2 max-h-40 overflow-y-auto border rounded">
            {customerOptions.map((c) => (
              <div key={c.id} onClick={() => { setSelectedCustomerId(c.id); setName(c.name || ''); setPhone(c.phone || ''); setEmail(c.email || ''); }} className={`p-2 cursor-pointer ${selectedCustomerId === c.id ? 'bg-blue-50' : ''}`}>
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-slate-500">{c.document || c.phone}</div>
              </div>
            ))}
            {customerOptions.length === 0 && <div className="p-2 text-xs text-slate-500">Digite ao menos 2 caracteres</div>}
          </div>
        </div>
      ) : null}

      {(!effectiveRepId || mode === 'new') && !isCustomerLinked ? (
        <div>
          <label className="block text-sm">CNPJ</label>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="w-full border rounded px-2 py-1" />
        </div>
      ) : null}

      <div>
        <label className="block text-sm">Condição de Pagamento</label>
        <input value={paymentLabel} onChange={(e) => setPaymentLabel(e.target.value)} className="w-full border rounded px-2 py-1" />
      </div>

      <div>
        <label className="block text-sm">Desconto (%)</label>
        <input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)} className="w-full border rounded px-2 py-1" />
      </div>

      <div>
        <label className="block text-sm">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm">Telefone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-2 py-1" />
      </div>
      <div>
        <button disabled={loading || checkoutBlocked} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60">{loading ? 'Carregando...' : 'Revisar Pedido'}</button>
      </div>
    </form>
  );
}
