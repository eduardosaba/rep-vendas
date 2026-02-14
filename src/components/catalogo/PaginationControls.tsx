'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  totalProducts: number;
  itemsPerPage: number;
  currentPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

const ITEMS_PER_PAGE_OPTIONS = [24, 48, 72, 999999];

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  totalProducts,
  itemsPerPage,
  currentPage,
  loading,
  onPageChange,
  onItemsPerPageChange,
}) => {
  // Só oculta se o total real for muito pequeno (ex: menos de 10 produtos)
  // Caso contrário, precisamos do seletor para mudar de 24 para "Todos"
  if (totalProducts <= 10 && itemsPerPage < 999999) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Itens por página:</label>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            const newItemsPerPage = parseInt(e.target.value, 10);
            onItemsPerPageChange(newItemsPerPage);
            localStorage.setItem('itemsPerPage', newItemsPerPage.toString());
          }}
          className="rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-sm text-gray-900 dark:text-slate-100"
        >
          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option >= 999999 ? 'Todos' : option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </button>

        <span className="text-sm text-gray-700">
          Página {currentPage} de {Math.ceil(totalProducts / itemsPerPage)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={
            currentPage >= Math.ceil(totalProducts / itemsPerPage) || loading
          }
          className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
