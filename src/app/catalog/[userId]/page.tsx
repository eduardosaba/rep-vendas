'use client';

import { memo, useState } from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import { Product, ProductCardProps, Settings } from '@/lib/types';

// Importe seus componentes de UI (que vamos criar/mover)
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

import { Filter, Grid3X3, List } from 'lucide-react'; // Ícones usados na UI

export default memo(function CatalogPage() {
  // 1. Obtenha toda a lógica e estados do Hook
  const {
    userId,
    loading,
    products,
    settings,
    cart,
    favorites,
    bestsellerProducts,
    allBrands,
    categories, // Já vem do hook
    searchTerm,
    priceRange,
    selectedBrands,
    selectedCategory,
    sortBy,
    sortOrder,
    viewMode,
    currentPage,
    totalProducts,
    itemsPerPage,
    showFilters,
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
    showOnlyBestsellers,
    showOnlyNew,
    setShowOnlyBestsellers,
    setShowOnlyNew,
    addToCart,
    toggleFavorite,
    clearFilters,
    formatPrice,
    priceAccessGranted,
    checkPriceAccess,
    requestPriceAccess,
  } = useCatalog();

  // Estado do modal de acesso aos preços
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceModalLoading, setPriceModalLoading] = useState(false);

  // Handler para solicitar acesso aos preços
  const handleRequestPriceAccess = () => {
    setShowPriceModal(true);
  };

  // Handler para submeter senha do modal
  const handlePriceAccessSubmit = async (password: string) => {
    setPriceModalLoading(true);
    try {
      return await requestPriceAccess(password);
    } finally {
      setPriceModalLoading(false);
    }
  };

  // Calcular filtros ativos para indicador visual
  const activeFiltersCount = [
    showOnlyBestsellers,
    showOnlyNew,
    selectedBrands.length > 0,
    priceRange[0] > 0 || priceRange[1] < 10000,
    searchTerm.trim() !== '',
  ].filter(Boolean).length;

  // Componentes memoizados para melhor performance
  const MemoizedProductCardGrid = memo(ProductCardGrid);
  const MemoizedProductCardList = memo(ProductCardList);

  // 2. Lógica de Loading inicial
  if (!userId || (loading && products.length === 0 && !settings)) {
    return <LoadingSpinner />;
  }

  // 3. Renderização da UI (agora apenas JSX)
  return (
    <div className="min-h-screen bg-gray-100">
      <CatalogHeader
        settings={settings}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        cart={cart}
        favorites={favorites}
        userId={userId}
      />

      <NavCategories
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        settings={settings}
      />

      {/* Hero Banner */}
      {settings?.banner_url && (
        <section className="bg-gray-100 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <img
              src={settings.banner_url}
              alt="Banner principal"
              className="h-64 w-full rounded-lg object-cover shadow-lg lg:h-80"
            />
          </div>
        </section>
      )}

      {/* Conteúdo Principal */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex">
          <SidebarFilters
            settings={settings}
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
          />

          {/* Grid de Produtos */}
          <main
            className={`${
              settings?.show_filter_price !== false ||
              settings?.show_filter_category !== false ||
              settings?.show_filter_bestseller !== false
                ? 'flex-1'
                : 'w-full'
            }`}
          >
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCategory === 'Todos'
                      ? `Todos os Produtos`
                      : `${selectedCategory}`}{' '}
                    ({totalProducts})
                  </h2>
                  {activeFiltersCount > 0 && (
                    <span className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-800">
                      <Filter className="mr-1 h-3 w-3" />
                      {activeFiltersCount} filtro
                      {activeFiltersCount > 1 ? 's' : ''} ativo
                      {activeFiltersCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Controles de Ordenação e Filtro Mobile */}
                <div className="flex items-center space-x-4">
                  {/* Controle de Preços */}
                  <div className="flex items-center space-x-2">
                    {checkPriceAccess() ? (
                      <div className="flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1">
                        <span className="text-sm font-medium text-green-700">
                          ✅ Preços visíveis
                        </span>
                        <button
                          onClick={() => {
                            // Limpar acesso aos preços
                            localStorage.removeItem('priceAccessGranted');
                            localStorage.removeItem('priceAccessExpiresAt');
                            window.location.reload(); // Recarregar para limpar estado
                          }}
                          className="text-xs text-green-600 underline hover:text-green-800"
                          title="Ocultar preços"
                        >
                          Ocultar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestPriceAccess}
                        className="flex items-center space-x-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        title="Solicitar acesso aos preços"
                      >
                        <span>🔒 Ver Preços</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="sort-select"
                      className="text-sm text-gray-600"
                    >
                      Ordenar por:
                    </label>
                    <select
                      id="sort-select"
                      value={`${sortBy}_${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('_');
                        setSortBy(field);
                        setSortOrder(order as 'asc' | 'desc');
                      }}
                      className="rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      aria-label="Ordenar produtos"
                    >
                      <option value="name_asc">Nome (A-Z)</option>
                      <option value="name_desc">Nome (Z-A)</option>
                      <option value="price_asc">Preço (Menor)</option>
                      <option value="price_desc">Preço (Maior)</option>
                      <option value="brand_asc">Marca (A-Z)</option>
                      <option value="brand_desc">Marca (Z-A)</option>
                    </select>
                  </div>

                  <div className="flex items-center rounded-lg border border-gray-300 bg-white p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`rounded p-2 transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title="Visualização em grade"
                      aria-label="Visualização em grade"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`rounded p-2 transition-colors ${
                        viewMode === 'list'
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title="Visualização em lista"
                      aria-label="Visualização em lista"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center text-sm text-gray-600 transition-colors hover:text-gray-800 md:hidden ${
                      settings?.show_filter_price === false &&
                      settings?.show_filter_category === false &&
                      settings?.show_filter_bestseller === false
                        ? 'hidden'
                        : ''
                    }`}
                    title="Mostrar filtros"
                    aria-label={`Mostrar filtros${activeFiltersCount > 0 ? ` (${activeFiltersCount} ativo${activeFiltersCount > 1 ? 's' : ''})` : ''}`}
                  >
                    <Filter className="mr-1 h-4 w-4" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 min-w-[18px] rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-xs text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* A Lista de Produtos */}
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'space-y-4'
                }
              >
                {loading
                  ? // Esqueleto de Loading
                    Array.from({ length: itemsPerPage }, (_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-lg border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="h-48 w-full rounded-t-lg bg-gray-200"></div>
                        <div className="p-4">
                          <div className="mb-2 h-4 w-1/4 rounded bg-gray-200"></div>
                          <div className="mb-2 h-6 w-3/4 rounded bg-gray-200"></div>
                          <div className="mb-4 h-4 w-1/2 rounded bg-gray-200"></div>
                          <div className="h-8 rounded bg-gray-200"></div>
                        </div>
                      </div>
                    ))
                  : // Produtos Reais
                    products.map((product) =>
                      viewMode === 'grid' ? (
                        <MemoizedProductCardGrid
                          key={product.id}
                          product={product}
                          isFavorite={favorites.has(product.id)}
                          onToggleFavorite={toggleFavorite}
                          onAddToCart={addToCart}
                          primaryColor={settings?.primary_color}
                          settings={settings}
                          userId={userId}
                          formatPrice={formatPrice}
                          hasPriceAccess={checkPriceAccess()}
                        />
                      ) : (
                        <MemoizedProductCardList
                          key={product.id}
                          product={product}
                          isFavorite={favorites.has(product.id)}
                          onToggleFavorite={toggleFavorite}
                          onAddToCart={addToCart}
                          primaryColor={settings?.primary_color}
                          settings={settings}
                          userId={userId}
                          formatPrice={formatPrice}
                          hasPriceAccess={checkPriceAccess()}
                        />
                      )
                    )}
              </div>

              {/* Mensagem de Nenhum Produto */}
              {!loading && products.length === 0 && (
                <div
                  className="py-16 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <div className="mb-4 text-6xl" aria-hidden="true">
                    🔍
                  </div>
                  <h3 className="mb-2 text-xl font-medium text-gray-900">
                    {activeFiltersCount > 0
                      ? 'Nenhum produto encontrado'
                      : 'Nenhum produto disponível'}
                  </h3>
                  <p className="mb-4 text-gray-600">
                    {activeFiltersCount > 0
                      ? `Tente ajustar seus filtros ou remover alguns para ver mais produtos.`
                      : 'Parece que ainda não há produtos cadastrados nesta categoria.'}
                  </p>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                      aria-label="Limpar todos os filtros aplicados"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              )}

              {/* Paginação */}
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

      <BestsellerCarousel
        products={bestsellerProducts}
        settings={settings}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onAddToCart={addToCart}
        formatPrice={formatPrice}
        userId={userId}
      />

      <CatalogFooter settings={settings} />

      <PriceAccessModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        onSubmit={handlePriceAccessSubmit}
        isLoading={priceModalLoading}
      />
    </div>
  );
});
