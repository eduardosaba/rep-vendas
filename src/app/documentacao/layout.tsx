import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentação e Manuais',
  description: 'Guia completo, tutoriais passo a passo e documentação oficial da plataforma RepVendas.',
  alternates: {
    canonical: '/documentacao',
  },
  openGraph: {
    title: 'Documentação e Manuais | RepVendas',
    description: 'Guia completo, tutoriais passo a passo e documentação oficial da plataforma RepVendas.',
  },
};

export default function DocumentacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
