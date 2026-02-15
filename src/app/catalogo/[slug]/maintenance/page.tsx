import { Construction, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function MaintenancePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Buscar informações da loja para mostrar branding mesmo em manutenção
  const { data: catalog } = await supabase
    .from('public_catalogs')
    .select('store_name, logo_url, primary_color, secondary_color')
    .eq('catalog_slug', slug)
    .maybeSingle();

  if (!catalog) return notFound();

  const primaryColor = catalog.primary_color || '#b9722e';
  const secondaryColor = catalog.secondary_color || '#0d1b2c';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-md w-full">
        {/* Card de Manutenção */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
          {/* Header com Logo */}
          {catalog.logo_url && (
            <div className="bg-white dark:bg-slate-800 p-6 border-b border-gray-100 dark:border-slate-700 flex justify-center">
              <img
                src={catalog.logo_url}
                alt={catalog.store_name}
                className="h-16 w-auto object-contain"
              />
            </div>
          )}

          {/* Conteúdo Principal */}
          <div className="p-8 text-center space-y-6">
            {/* Ícone Animado */}
            <div className="relative inline-block">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="relative bg-opacity-10 rounded-full p-6"
                style={{ backgroundColor: primaryColor }}
              >
                <Construction
                  size={64}
                  style={{ color: primaryColor }}
                  className="animate-bounce"
                />
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <h1
                className="text-3xl font-black"
                style={{ color: secondaryColor }}
              >
                Loja em Manutenção
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-lg font-medium">
                {catalog.store_name}
              </p>
            </div>

            {/* Mensagem */}
            <div className="space-y-4">
              <div
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  backgroundColor: `${primaryColor}10`,
                  borderColor: `${primaryColor}30`,
                }}
              >
                <AlertCircle
                  size={20}
                  style={{ color: primaryColor }}
                  className="flex-shrink-0 mt-0.5"
                />
                <p
                  className="text-sm text-left font-medium"
                  style={{ color: secondaryColor }}
                >
                  Estamos realizando melhorias em nosso Catálogo / loja virtual
                  para oferecer uma experiência ainda melhor para você.
                </p>
              </div>

              <div
                className="flex items-center justify-center gap-2 text-sm font-medium"
                style={{ color: primaryColor }}
              >
                <Clock size={16} />
                <span>
                  O catálogo virtual está em manutenção e logo ficará online.
                </span>
              </div>
            </div>

            {/* Rodapé */}
            <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Desculpe pelo inconveniente temporário
              </p>
            </div>
          </div>

          {/* Barra decorativa inferior */}
          <div
            className="h-2"
            style={{
              background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
