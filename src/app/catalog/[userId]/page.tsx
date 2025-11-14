'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { Search, Heart, ShoppingCart, LogIn, Filter, Star, X } from 'lucide-react'
import { useToast } from '../../../hooks/useToast'

// Função para formatar preços no formato brasileiro
const formatPrice = (price: number): string => {
  return price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

interface Product {
  id: string
  name: string
  brand?: string
  reference_code?: string
  description?: string
  price: number
  image_url?: string
  bestseller?: boolean
}

interface Settings {
  id?: string
  user_id?: string
  name?: string
  email?: string
  phone?: string
  logo_url?: string
  banner_url?: string
  primary_color?: string
  secondary_color?: string
  header_color?: string
  font_family?: string
  title_color?: string
  icon_color?: string
  show_shipping?: boolean
  show_installments?: boolean
  show_delivery_address?: boolean
  show_installments_checkout?: boolean
  show_discount?: boolean
  show_old_price?: boolean
}

interface CartItem {
  product: Product
  quantity: number
}

// Componente para visualização em grid
const ProductCardGrid: React.FC<{
  product: Product
  isFavorite: boolean
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, quantity: number) => void
  primaryColor?: string
  settings?: Settings | null
}> = ({ product, isFavorite, onToggleFavorite, onAddToCart, primaryColor, settings }) => {
  const [quantity, setQuantity] = useState(1)
  const [showImageModal, setShowImageModal] = useState(false)

  const handleImageClick = () => {
    console.log('Imagem clicada para produto:', product.name, 'URL:', product.image_url)
    setShowImageModal(true)
  }

  const handleCloseModal = () => {
    console.log('Fechando modal de imagem')
    setShowImageModal(false)
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="relative">
          {product.image_url ? (
            <>
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => setShowImageModal(true)}
              />
              {/* Overlay de zoom */}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="bg-white bg-opacity-90 rounded-full p-2">
                  <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Sem imagem</span>
            </div>
          )}
          {/* Badge de Bestseller */}
          {product.bestseller && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold flex items-center">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Bestseller
            </div>
          )}
          <button
            onClick={() => onToggleFavorite(product.id)}
            className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-2">
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
              {product.brand || 'Marca'}
            </span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-blue-600 cursor-pointer line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {product.description || 'Sem descrição disponível'}
          </p>

          <div className="mb-3">
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="text-xl font-bold text-gray-900">
                R$ {formatPrice(product.price)}
              </span>
              {settings?.show_old_price && (
                <span className="text-sm text-gray-500 line-through">
                  R$ {formatPrice(product.price * 1.2)}
                </span>
              )}
              {settings?.show_discount && (
                <span className="text-xs text-green-600 font-medium">
                  17% OFF
                </span>
              )}
            </div>
            {settings?.show_installments && (
              <div className="text-xs text-green-600 mt-1">
                12x de R$ {formatPrice(product.price / 12)} sem juros
              </div>
            )}
          </div>

          {settings?.show_shipping && (
            <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
              <div className="flex items-center">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Frete grátis</span>
              </div>
              <span>📍 SP</span>
            </div>
          )}

          <div className="flex items-center space-x-2 mb-3">
            <label className="text-sm text-gray-700">Qtd:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
            />
          </div>

          <button
            onClick={() => onAddToCart(product.id, quantity)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            style={{ backgroundColor: primaryColor || '#3B82F6' }}
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>

      {/* Modal de imagem ampliada */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Componente para visualização em lista
const ProductCardList: React.FC<{
  product: Product
  isFavorite: boolean
  onToggleFavorite: (productId: string) => void
  onAddToCart: (productId: string, quantity: number) => void
  primaryColor?: string
  settings?: Settings | null
}> = ({ product, isFavorite, onToggleFavorite, onAddToCart, primaryColor, settings }) => {
  const [quantity, setQuantity] = useState(1)
  const [showImageModal, setShowImageModal] = useState(false)

  const handleImageClick = () => {
    console.log('Imagem clicada para produto (lista):', product.name, 'URL:', product.image_url)
    setShowImageModal(true)
  }

  const handleCloseModal = () => {
    console.log('Fechando modal de imagem (lista)')
    setShowImageModal(false)
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex">
          <div className="w-48 h-32 flex-shrink-0 relative">
            {product.image_url ? (
              <>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={handleImageClick}
                />
                {/* Overlay de zoom */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="bg-white bg-opacity-90 rounded-full p-2">
                    <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                <span className="text-gray-400 text-sm">Sem imagem</span>
              </div>
            )}
            {/* Badge de Bestseller */}
            {product.bestseller && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold flex items-center">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Bestseller
              </div>
            )}
          </div>

          <div className="flex-1 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                    {product.brand || 'Marca'}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {product.description || 'Sem descrição disponível'}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-2xl font-bold text-gray-900">
                        R$ {formatPrice(product.price)}
                      </span>
                      {settings?.show_old_price && (
                        <span className="text-sm text-gray-500 line-through">
                          R$ {formatPrice(product.price * 1.2)}
                        </span>
                      )}
                      {settings?.show_discount && (
                        <span className="text-xs text-green-600 font-medium">
                          17% OFF
                        </span>
                      )}
                    </div>
                    {settings?.show_installments && (
                      <div className="text-xs text-green-600">
                        12x de R$ {formatPrice(product.price / 12)} sem juros
                      </div>
                    )}
                    {settings?.show_shipping && (
                      <div className="flex items-center text-xs text-gray-600 mt-1">
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Frete grátis</span>
                        <span className="ml-2">📍 SP</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Qtd:</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                      />
                    </div>
                    <button
                      onClick={() => onAddToCart(product.id, quantity)}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      style={{ backgroundColor: primaryColor || '#3B82F6' }}
                    >
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onToggleFavorite(product.id)}
                className="p-2 hover:bg-gray-50 rounded-full"
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de imagem ampliada */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function CatalogPage() {
  const params = useParams()
  const userId = params.userId as string
  const [settings, setSettings] = useState<Settings | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [cart, setCart] = useState<{[key: string]: number}>({})
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    if (userId) {
      loadCatalogData()
      loadUserData()
    }
  }, [userId])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedCategory, priceRange, selectedBrands, sortBy, sortOrder])

  const loadUserData = () => {
    // Carregar favoritos do localStorage
    const savedFavorites = localStorage.getItem('favorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }

    // Carregar carrinho do localStorage
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify([...newFavorites]))
  }

  const addToCart = (productId: string, quantity: number) => {
    const newCart = { ...cart }
    const existingQuantity = newCart[productId] || 0
    newCart[productId] = existingQuantity + quantity
    setCart(newCart)
    localStorage.setItem('cart', JSON.stringify(newCart))

    // Encontrar o produto para mostrar o nome no toast
    const product = products.find(p => p.id === productId)

    addToast({
      title: 'Produto adicionado!',
      message: `${quantity}x ${product?.name || 'Produto'} adicionado ao carrinho`,
      type: 'success'
    })
  }

  const loadCatalogData = async () => {
    try {
      // Carregar produtos do usuário específico
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)

      setProducts(prods || [])

      // Carregar configurações do usuário específico
      const { data: sets } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (sets) {
        setSettings(sets)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do catálogo:', error)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter(product => product.brand === selectedCategory)
    }

    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => selectedBrands.includes(product.brand || ''))
    }

    filtered = filtered.filter(product => product.price >= priceRange[0] && product.price <= priceRange[1])

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'brand':
          aValue = (a.brand || '').toLowerCase()
          bValue = (b.brand || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredProducts(filtered)
  }

  const categories = ['Todos', ...new Set(products.map(p => p.brand).filter(Boolean))]

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando catálogo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200" style={{ backgroundColor: settings?.header_color || '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-2 text-sm" style={{ color: settings?.icon_color || '#4B5563' }}>
            <div className="flex items-center space-x-4">
              {settings?.phone && (
                <>
                  <span>📞 {settings.phone}</span>
                  {settings?.email && <span>|</span>}
                </>
              )}
              {settings?.email && (
                <span>✉️ {settings.email}</span>
              )}
            </div>
          </div>

          {/* Main Header */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-14 w-auto" />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900" style={{ color: settings?.title_color || '#111827', fontFamily: settings?.font_family || 'Inter, sans-serif' }}>
                  {settings?.name || 'Rep-Vendas'}
                </h1>
              )}
            </div>

            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <button className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700" style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}>
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/favorites')}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <Heart className="h-6 w-6" />
                <span className="text-xs">Favoritos ({favorites.size})</span>
              </button>
              <button
                onClick={() => router.push(`/catalog/${userId}/checkout`)}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-xs">Carrinho ({Object.values(cart).reduce((total, qty) => total + qty, 0)})</span>
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <LogIn className="h-6 w-6" />
                <span className="text-xs">Entrar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <span className="text-lg font-semibold text-gray-900">Departamentos</span>
              <div className="flex items-center space-x-6 overflow-x-auto">
                {categories.slice(0, 6).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`text-sm whitespace-nowrap font-medium ${
                      selectedCategory === category
                        ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">|</span>
              <button className="text-sm text-gray-700 hover:text-gray-900">Lançamentos</button>
              <button className="text-sm text-gray-700 hover:text-gray-900">Best Sellers</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      {settings?.banner_url && (
        <section className="bg-gray-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={settings.banner_url}
              alt="Banner principal"
              className="w-full h-64 lg:h-80 object-cover rounded-lg shadow-lg"
            />
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex">
          {/* Sidebar Filters */}
          <aside className={`w-64 pr-6 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="bg-white p-4 rounded shadow-sm">
              <h3 className="font-medium text-gray-900 mb-4">Filtros</h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço</label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>R$ {formatPrice(priceRange[0])}</span>
                    <span>R$ {formatPrice(priceRange[1])}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Marcas</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Array.from(new Set(products.map(p => p.brand).filter(Boolean))).map((brand) => {
                    const brandName = brand as string
                    return (
                      <label key={brandName} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brandName)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrands([...selectedBrands, brandName])
                            } else {
                              setSelectedBrands(selectedBrands.filter(b => b !== brandName))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{brandName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('Todos')
                  setPriceRange([0, 10000])
                  setSelectedBrands([])
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200"
              >
                Limpar Filtros
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory === 'Todos' ? 'Todos os Produtos' : selectedCategory}
              </h2>
              <div className="flex items-center space-x-4">
                {/* Ordenação */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Ordenar por:</label>
                  <select
                    value={`${sortBy}_${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('_')
                      setSortBy(field)
                      setSortOrder(order as 'asc' | 'desc')
                    }}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="name_asc">Nome (A-Z)</option>
                    <option value="name_desc">Nome (Z-A)</option>
                    <option value="price_asc">Preço (Menor)</option>
                    <option value="price_desc">Preço (Maior)</option>
                    <option value="brand_asc">Marca (A-Z)</option>
                    <option value="brand_desc">Marca (Z-A)</option>
                  </select>
                </div>

                {/* Toggle View Mode */}
                <div className="flex items-center bg-white rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                  >
                    📋
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden flex items-center text-sm text-gray-600"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filtros
                </button>
              </div>
            </div>

            <div className={viewMode === 'grid'
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
            }>
              {filteredProducts.map((product) => (
                viewMode === 'grid' ? (
                  <ProductCardGrid
                    key={product.id}
                    product={product}
                    isFavorite={favorites.has(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onAddToCart={addToCart}
                    primaryColor={settings?.primary_color}
                    settings={settings}
                  />
                ) : (
                  <ProductCardList
                    key={product.id}
                    product={product}
                    isFavorite={favorites.has(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onAddToCart={addToCart}
                    primaryColor={settings?.primary_color}
                    settings={settings}
                  />
                )
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-600">Tente ajustar sua busca ou filtros.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div>
              <h4 className="font-bold mb-4 text-lg">Institucional</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre nós</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Imprensa</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Comunicação</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-lg">Ajuda</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Como comprar</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pagamento</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Entrega</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trocas e devoluções</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-lg">Vendedor</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Como vender</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Desenvolvimento</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Marketplace</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Vendas corporativas</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-lg">Serviços</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Cartão Luiza</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Magalu Pay</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Seguros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Consórcio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Lista de casamento</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-lg">Redes Sociais</h4>
              <div className="flex space-x-4 mb-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">📘 Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">📷 Instagram</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">🐦 Twitter</a>
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
                <p>&copy; 2025 {settings?.name || 'Rep-Vendas'}. Todos os direitos reservados.</p>
                <p>CNPJ: XX.XXX.XXX/XXXX-XX | Endereço: Rua Exemplo, 123 - Cidade/SP</p>
              </div>
              <div className="flex items-center space-x-4">
                <img src="/ssl-icon.png" alt="SSL" className="h-8" />
                <span className="text-sm text-gray-400">Site seguro</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}