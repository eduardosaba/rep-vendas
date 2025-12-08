'use client';

import { memo, useState } from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import { Product, Settings } from '@/lib/types';
import { Filter, Grid3X3, List } from 'lucide-react';

// Importação dos componentes visuais
import { ProductCardGrid } from '@/components/catalog/ProductCardGrid';
import { ProductCardList } from '@/components/catalog/ProductCardList';
import { LoadingSpinner } from '@/components/catalog/LoadingSpinner';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { NavCategories } from '@/components/catalog/NavCategories';
import { SidebarFilters } from '@/components/catalog/SidebarFilters';
import { PaginationControls } from '@/components/catalog/PaginationControls';
import { BestsellerCarousel } from '@/components/catalog/BestsellerCarousel';
import { CatalogFooter } from '@/components/catalog/CatalogFooter';
import { PriceAccessModal } from '@/components/catalog/PriceAccessModal';
import { CartSaveLoadModal } from '@/components/catalog/CartSaveLoadModal';

interface Props {
  initialUserId: string;
  initialSettings: Settings | null;
  initialProducts: Product[];
}

export default memo(function CatalogClient({
  initialUserId,
  initialSettings,
  initialProducts,
}: Props) {
  // Inicializamos o hook passando o ID resolvido pelo servidor para garantir consistência
  // Nota: Certifique-se de que o seu hook useCatalog aceita um argumento opcional para o userId
  const {
    userId,
    loading,
    products,
    settings,
    cart,
    loadedOrderCode,
    favorites,
    bestsellerProducts,
    allBrands,
    brandLogos,
    categories,
    searchTerm,
    priceRange,
    selectedBrands,
    selectedCategory,
    sortBy,
    sortOrder,
    viewMode,
    currentPage,
    itemsPerPage,
    showFilters,
    totalProducts,
    showOnlyBestsellers,
    showOnlyNew,
    setSearchTerm,
    setPriceRange,
    setSelectedBrands,
    setSelectedCategory,
    setSortBy,
    setSortOrder,
    setViewMode,
    setCurrentPage,
    setItemsPerPage,
    setShowFilters,
    setShowOnlyBestsellers,
    setShowOnlyNew,
    addToCart,
    toggleFavorite,
    clearFilters,
    formatPrice,
    priceAccessGranted,
    checkPriceAccess,
    requestPriceAccess,
    saveCart,
    loadCart,
  } = useCatalog(initialUserId, initialSettings);

  // --- Estados Locais para Modais ---
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceModalLoading, setPriceModalLoading] = useState(false);

  const [showCartModal, setShowCartModal] = useState(false);
  const [cartModalLoading, setCartModalLoading] = useState(false);

  // --- Handlers ---

  const handleRequestPriceAccess = () => {
    setShowPriceModal(true);
  };

  const handlePriceAccessSubmit = async (password: string) => {
    setPriceModalLoading(true);
    try {
      const success = await requestPriceAccess(password);
      return success;
    } finally {
      setPriceModalLoading(false);
    }
  };

  const handleSaveCart = async () => {
    setCartModalLoading(true);
    try {
      const code = await saveCart();
      if (code) return { success: true, code };
      return { success: false, error: 'Não foi possível salvar o pedido' };
    } finally {
      setCartModalLoading(false);
    }
  };

  const handleLoadCart = async (code: string) => {
    setCartModalLoading(true);
    try {
      const ok = await loadCart(code);
      if (ok) return { success: true };
      return { success: false, error: 'Código inválido ou expirado' };
    } finally {
      setCartModalLoading(false);
    }
  };

  // Cálculos Auxiliares
  const activeFiltersCount = [
    showOnlyBestsellers,
    showOnlyNew,
    selectedBrands.length > 0,
    priceRange[0] > 0 || priceRange[1] < 10000,
    searchTerm.trim() !== '',
  ].filter(Boolean).length;

  const cartItemCount = Object.values(cart).reduce(
    (total, qty) => total + qty,
    0
  );
  const currentSettings = settings || initialSettings;

  // Loading Inicial Crítico (apenas se não tivermos dados nenhuns)
  if (loading && !currentSettings && products.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* 1. Cabeçalho */}
      <CatalogHeader
        settings={currentSettings}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        cart={cart}
        favorites={favorites}
        userId={initialUserId}
        loadedOrderCode={loadedOrderCode}
      />

      {/* 2. Navegação de Categorias */}
      <NavCategories
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        settings={currentSettings}
      />

      {/* 3. Banner Promocional (Opcional) */}
      {currentSettings?.banner_url && (
        <section className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="relative h-48 w-full overflow-hidden rounded-xl sm:h-64 lg:h-80">
              <img
                src={currentSettings.banner_url}
                alt="Banner da Loja"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* 4. Área Principal (Com Sidebar e Grid) */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de Filtros (Desktop: Coluna Esquerda / Mobile: Gaveta) */}
          <SidebarFilters
            settings={currentSettings}
            showFilters={showFilters}
            priceRange={priceRange}
            onPriceChange={setPriceRange}
            allBrands={allBrands}
            selectedBrands={selectedBrands}
            onBrandChange={setSelectedBrands}
            onClearFilters={clearFilters}
            formatPrice={formatPrice}
            showOnlyBestsellers={showOnlyBestsellers}
            showOnlyNew={showOnlyNew}
            onBestsellerChange={setShowOnlyBestsellers}
            onNewChange={setShowOnlyNew}
            brandLogos={brandLogos}
          />

          {/* Conteúdo Central */}
          <main className="flex-1 min-w-0">
            {/* Barra de Ferramentas do Catálogo */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Título e Contador */}
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCategory === 'Todos' ? 'Produtos' : selectedCategory}
                </h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {totalProducts}
                </span>
              </div>

              {/* Controles (Mobile: Filtro / Desktop: Ordenação e View) */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Botão Filtro Mobile */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Controle de Preços (Ver/Ocultar) */}
                {checkPriceAccess() ? (
                  <button
                    onClick={() => {
                      localStorage.removeItem('priceAccessGranted');
                      window.location.reload();
                    }}
                    className="hidden sm:inline-flex items-center text-xs text-green-600 hover:text-green-700 underline"
                  >
                    Ocultar Preços
                  </button>
                ) : (
                  <button
                    onClick={handleRequestPriceAccess}
                    className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    🔐 Ver Preços
                  </button>
                )}

                {/* Ordenação */}
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('_');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="rounded-lg border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="name_asc">Nome (A-Z)</option>
                  <option value="name_desc">Nome (Z-A)</option>
                  <option value="price_asc">Preço (Menor)</option>
                  <option value="price_desc">Preço (Maior)</option>
                </select>

                {/* Modos de Visualização */}
                <div className="hidden sm:flex items-center rounded-lg border border-gray-300 bg-white p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de Produtos */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'space-y-4'
              }
            >
              {products.length > 0 ? (
                products.map((product) =>
                  viewMode === 'grid' ? (
                    <ProductCardGrid
                      key={product.id}
                      product={product}
                      isFavorite={favorites.has(product.id)}
                      onToggleFavorite={toggleFavorite}
                      onAddToCart={addToCart}
                      primaryColor={currentSettings?.primary_color}
                      formatPrice={formatPrice}
                      hasPriceAccess={checkPriceAccess()}
                      userId={initialUserId}
                      settings={currentSettings}
                    />
                  ) : (
                    // Caso tenha o componente de lista implementado
                    <div key={product.id}>
                      Card Lista (Implementar ProductCardList)
                    </div>
                  )
                )
              ) : (
                <div className="col-span-full py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Filter className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Nenhum produto encontrado
                  </h3>
                  <p className="mt-1 text-gray-500">
                    Tente ajustar seus filtros ou buscar por outro termo.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50"
                  >
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="mt-8">
              <PaginationControls
                totalProducts={totalProducts}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                loading={loading}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </main>
        </div>
      </div>

      {/* 5. Carrossel de Best Sellers */}
      {bestsellerProducts.length > 0 && (
        <section className="border-t bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-bold text-gray-900">
              Best Sellers
            </h2>
            <BestsellerCarousel
              products={bestsellerProducts}
              settings={currentSettings}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onAddToCart={addToCart}
              formatPrice={formatPrice}
              userId={initialUserId}
            />
          </div>
        </section>
      )}

      {/* 6. Rodapé */}
      <CatalogFooter settings={currentSettings} />

      {/* 7. Modais Globais */}
      <PriceAccessModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        onSubmit={handlePriceAccessSubmit}
        isLoading={priceModalLoading}
      />

      <CartSaveLoadModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        onSaveCart={handleSaveCart}
        onLoadCart={handleLoadCart}
        isLoading={cartModalLoading}
        cartItemCount={cartItemCount}
      />

      {/* Botão Flutuante para abrir Modal de Pedido (se não estiver no header) */}
      {cartItemCount > 0 && (
        <button
          onClick={() => setShowCartModal(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-300 lg:hidden"
          title="Gerenciar Pedido"
        >
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold border-2 border-white">
            {cartItemCount}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
      )}
    </div>
  );
});
