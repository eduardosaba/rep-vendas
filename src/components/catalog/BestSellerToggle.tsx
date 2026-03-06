'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createSupabaseClient(supabaseUrl, supabaseAnonKey) : null;

export default function BestSellerToggle({ productId, initial }: { productId: string; initial: boolean; }) {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<boolean>(!!initial);

  const toggle = async () => {
    if (!supabase) return toast.error('Supabase client não configurado');
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_best_seller: !value })
        .eq('id', productId);
      if (error) throw error;
      setValue(!value);
      toast.success(!value ? 'Adicionado aos destaques!' : 'Removido dos destaques');
    } catch (err: any) {
      console.error('toggle best seller error', err);
      toast.error(err?.message || 'Erro ao atualizar destaque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={value ? 'Remover dos destaques' : 'Adicionar aos destaques'}
      className={`p-2 rounded-xl transition-all inline-flex items-center justify-center ${value ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
    >
      <Star size={18} fill={value ? 'currentColor' : 'none'} />
    </button>
  );
}
