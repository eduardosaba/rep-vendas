"use client";

import { Settings } from "@/lib/types";

interface CatalogFooterProps {
  settings: Settings | null;
}

export const CatalogFooter: React.FC<CatalogFooterProps> = ({ settings }) => {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div>
            <h4 className="font-bold mb-4 text-lg">Institucional</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Sobre nós
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Nossa missão
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Política de privacidade
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Termos de uso
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Central de ajuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Como comprar
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Formas de pagamento
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Prazos de entrega
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Trocas e devoluções
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Vendedor</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Área do vendedor
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Como vender
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Programa de vantagens
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Suporte ao vendedor
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Contato</h4>
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
            <h4 className="font-bold mb-4 text-lg">Redes Sociais</h4>
            <div className="flex space-x-4 mb-4">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                📘 Facebook
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                📷 Instagram
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
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

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              <p>
                &copy; 2025 {settings?.name || "Rep-Vendas"}. Todos os direitos
                reservados.
              </p>
              <p>
                Sistema de vendas B2B - CNPJ: XX.XXX.XXX/XXXX-XX
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400 flex items-center">
                🔒 Site seguro SSL
              </span>
              <span className="text-sm text-gray-400">
                Ambiente B2B
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
