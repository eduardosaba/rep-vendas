import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ShoppingBag,
  Zap,
  ImagePlus,
  ChevronRight,
  ChevronLeft,
  LucideIcon,
} from 'lucide-react';

// [TypeScript] Definimos a "forma" que os nossos dados devem ter
interface Feature {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon; // Tipo específico para ícones da biblioteca Lucide
  color: string;
}

const features: Feature[] = [
  {
    id: 1,
    title: 'Gestão Completa de Vendas',
    description:
      'Acompanhe as suas métricas, vendas por marca e metas num dashboard intuitivo e centralizado.',
    icon: BarChart3,
    color: 'bg-primary',
  },
  {
    id: 2,
    title: 'Catálogo Digital Inteligente',
    description:
      'Partilhe os seus produtos com clientes. Proteja os preços com senha ou permita orçamentos rápidos.',
    icon: ShoppingBag,
    color: 'bg-primary',
  },
  {
    id: 3,
    title: 'Pedidos em Segundos',
    description:
      'Lance pedidos rapidamente no balcão ou em movimento. Otimizado para a agilidade do representante.',
    icon: Zap,
    color: 'bg-violet-500',
  },
  {
    id: 4,
    title: 'Importação Visual',
    description:
      'Adicione produtos arrastando fotos. O nosso sistema organiza o seu catálogo sem a dor de cabeça das planilhas.',
    icon: ImagePlus,
    color: 'bg-purple-500',
  },
];

export default function LoginOnboarding() {
  // [TypeScript] Explicitamos que o estado é um número
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Rotação automática dos slides a cada 5 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % features.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + features.length) % features.length);

  const CurrentIcon = features[currentSlide].icon;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-slate-900 p-12 text-white">
      {/* Fundo com Efeito Gradiente Animado (Simples) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/80 via-slate-900 to-primary/95 opacity-90"></div>

      {/* Círculos Decorativos de Fundo */}
      <div className="animate-blob absolute left-10 top-10 h-64 w-64 rounded-full bg-primary opacity-20 mix-blend-multiply blur-3xl filter"></div>
      <div className="animate-blob animation-delay-2000 absolute bottom-10 right-10 h-64 w-64 rounded-full bg-purple-600 opacity-20 mix-blend-multiply blur-3xl filter"></div>

      {/* Conteúdo Principal */}
      <div className="relative z-10 max-w-md text-center">
        {/* Ícone do Slide */}
        <div
          className={`mx-auto mb-8 flex h-24 w-24 transform items-center justify-center rounded-2xl bg-white/10 p-6 shadow-2xl ring-1 ring-white/20 backdrop-blur-sm transition-all duration-500 hover:scale-110`}
        >
          <CurrentIcon size={48} className="text-white" />
        </div>

        {/* Texto do Slide com Animação Suave */}
        <div className="min-h-[180px] space-y-4 transition-opacity duration-500">
          <h2 className="text-3xl font-bold tracking-tight">
            {features[currentSlide].title}
          </h2>
          <p className="text-lg leading-relaxed text-slate-300">
            {features[currentSlide].description}
          </p>
        </div>

        {/* Indicadores (Pontinhos) */}
        <div className="mt-8 flex justify-center gap-3">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Botões de Navegação Lateral */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/30 transition-colors hover:text-white"
      >
        <ChevronLeft size={32} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/30 transition-colors hover:text-white"
      >
        <ChevronRight size={32} />
      </button>

      {/* Rodapé Fixo */}
      <div className="absolute bottom-8 z-10 text-sm text-slate-500">
        © 2024 Sistema Rep-Vendas. Potencialize o seu negócio.
      </div>
    </div>
  );
}
