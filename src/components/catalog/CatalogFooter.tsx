"use client";

import { Settings } from "../../lib/types";

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
                  Carreiras
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Imprensa
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Comunicação
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Ajuda</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Como comprar
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pagamento
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Entrega
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Trocas e devoluções
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Segurança
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Vendedor</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Como vender
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Desenvolvimento
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Marketplace
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Vendas corporativas
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Serviços</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Cartão Luiza
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Magalu Pay
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Seguros
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Consórcio
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Lista de casamento
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Redes Sociais</h4>
            <div className="flex space-x-4 mb-4">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                📘 Facebook
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                📷 Instagram
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                🐦 Twitter
              </a>
            </div>
            <div className="text-sm text-gray-400">
              <p className="mb-2">📧 Newsletter</p>
              <p>Receba ofertas exclusivas</p>
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
                CNPJ: XX.XXX.XXX/XXXX-XX | Endereço: Rua Exemplo, 123 -
                Cidade/SP
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Site seguro</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
