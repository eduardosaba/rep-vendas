'use client';

import { Settings } from '@/lib/types';

interface CatalogFooterProps {
  settings: Settings | null;
}

export const CatalogFooter: React.FC<CatalogFooterProps> = ({ settings }) => {
  return (
    <footer className="mt-16 bg-gray-900 py-12 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <h4 className="mb-4 text-lg font-bold">Institucional</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Sobre nós
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Nossa missão
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Política de privacidade
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Termos de uso
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-bold">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Central de ajuda
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Como comprar
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Formas de pagamento
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Prazos de entrega
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Trocas e devoluções
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-bold">Vendedor</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Área do vendedor
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Como vender
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Programa de vantagens
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Suporte ao vendedor
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-bold">Contato</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <p>
                <span className="block font-medium">📞 Telefone</span>
                <span>(11) 9999-9999</span>
              </p>
              <p>
                <span className="block font-medium">📧 Email</span>
                <span>contato@repvendas.com.br</span>
              </p>
              <p>
                <span className="block font-medium">🕒 Horário</span>
                <span>Seg-Sex: 8h às 18h</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-bold">Redes Sociais</h4>
            <div className="mb-4 flex space-x-4">
              <a
                href="#"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="Facebook"
              >
                📘 Facebook
              </a>
              <a
                href="#"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="Instagram"
              >
                📷 Instagram
              </a>
              <a
                href="#"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="LinkedIn"
              >
                💼 LinkedIn
              </a>
            </div>
            <div className="text-sm text-gray-400">
              <p className="mb-2">📧 Newsletter</p>
              <p>Receba ofertas exclusivas e novidades</p>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 text-sm text-gray-400 md:mb-0">
              <p>
                &copy; 2025 {settings?.name || 'Rep-Vendas'}. Todos os direitos
                reservados.
              </p>
              <p>Sistema de vendas B2B - CNPJ: XX.XXX.XXX/XXXX-XX</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-sm text-gray-400">
                🔒 Site seguro SSL
              </span>
              <span className="text-sm text-gray-400">Ambiente B2B</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
