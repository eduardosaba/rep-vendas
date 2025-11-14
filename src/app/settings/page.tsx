'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { uploadImage, deleteImage } from '../../lib/storage'
import { useRouter } from 'next/navigation'
import { Upload, Image, Settings, Save, X } from 'lucide-react'

interface User {
  id: string
  email?: string
}

interface Settings {
  name: string
  email: string
  phone: string
  logo_url?: string
  banner_url?: string
  primary_color: string
  secondary_color: string
  header_color: string
  font_family: string
  title_color: string
  icon_color: string
  email_provider?: string
  email_api_key?: string
  email_from?: string
  show_shipping?: boolean
  show_installments?: boolean
  show_delivery_address?: boolean
  show_installments_checkout?: boolean
  show_discount?: boolean
  show_old_price?: boolean
}

interface UploadingState {
  logo: boolean
  banner: boolean
  product: boolean
  brand: boolean
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({
    name: '',
    email: '',
    phone: '',
    logo_url: '',
    banner_url: '',
    primary_color: '#3B82F6', // blue-500
    secondary_color: '#6B7280', // gray-500
    header_color: '#FFFFFF', // white
    font_family: 'Inter, sans-serif',
    title_color: '#111827', // gray-900
    icon_color: '#4B5563', // gray-600
    email_provider: 'resend',
    email_api_key: '',
    email_from: '',
    show_shipping: true,
    show_installments: true,
    show_delivery_address: true,
    show_installments_checkout: true,
    show_discount: true,
    show_old_price: true
  })
  const [uploading, setUploading] = useState<UploadingState>({
    logo: false,
    banner: false,
    product: false,
    brand: false
  })
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadSettings(user.id)
      }
    }
    getUser()
  }, [router])

  const loadSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data && !error) {
      // Garantir que todos os valores sejam strings ou valores apropriados
      setSettings({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        logo_url: data.logo_url || '',
        banner_url: data.banner_url || '',
        primary_color: data.primary_color || '#3B82F6',
        secondary_color: data.secondary_color || '#6B7280',
        header_color: data.header_color || '#FFFFFF',
        font_family: data.font_family || 'Inter, sans-serif',
        title_color: data.title_color || '#111827',
        icon_color: data.icon_color || '#4B5563',
        email_provider: data.email_provider || 'resend',
        email_api_key: data.email_api_key || '',
        email_from: data.email_from || '',
        show_shipping: data.show_shipping !== undefined ? data.show_shipping : true,
        show_installments: data.show_installments !== undefined ? data.show_installments : true,
        show_delivery_address: data.show_delivery_address !== undefined ? data.show_delivery_address : true,
        show_installments_checkout: data.show_installments_checkout !== undefined ? data.show_installments_checkout : true,
        show_discount: data.show_discount !== undefined ? data.show_discount : true,
        show_old_price: data.show_old_price !== undefined ? data.show_old_price : true
      })
    }
  }

  const uploadImageToBucket = async (file: File, bucket: string, field: keyof UploadingState) => {
    if (!user) return

    setUploading(prev => ({ ...prev, [field]: true }))
    setMessage('')

    const result = await uploadImage(file, bucket, user.id)

    if (result.success) {
      if (field === 'logo') {
        setSettings(prev => ({ ...prev, logo_url: result.publicUrl }))
      } else if (field === 'banner') {
        setSettings(prev => ({ ...prev, banner_url: result.publicUrl }))
      }
      setMessage(`Imagem enviada com sucesso para ${bucket}!`)
    } else {
      setMessage(`Erro ao fazer upload: ${result.error}`)
    }

    setUploading(prev => ({ ...prev, [field]: false }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, bucket: string, field: keyof UploadingState) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadImageToBucket(file, bucket, field)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    try {
      // Primeiro, tentar atualizar se já existe
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      let result
      if (existing) {
        // Atualizar registro existente
        result = await supabase
          .from('settings')
          .update({
            name: settings.name || null,
            email: settings.email || null,
            phone: settings.phone || null,
            logo_url: settings.logo_url || null,
            banner_url: settings.banner_url || null,
            primary_color: settings.primary_color || '#3B82F6',
            secondary_color: settings.secondary_color || '#6B7280',
            header_color: settings.header_color || '#FFFFFF',
            font_family: settings.font_family || 'Inter, sans-serif',
            title_color: settings.title_color || '#111827',
            icon_color: settings.icon_color || '#4B5563',
            email_provider: settings.email_provider || 'resend',
            email_api_key: settings.email_api_key || null,
            email_from: settings.email_from || null,
            show_shipping: settings.show_shipping !== undefined ? settings.show_shipping : true,
            show_installments: settings.show_installments !== undefined ? settings.show_installments : true,
            show_delivery_address: settings.show_delivery_address !== undefined ? settings.show_delivery_address : true,
            show_installments_checkout: settings.show_installments_checkout !== undefined ? settings.show_installments_checkout : true,
            show_discount: settings.show_discount !== undefined ? settings.show_discount : true,
            show_old_price: settings.show_old_price !== undefined ? settings.show_old_price : true
          })
          .eq('user_id', user.id)
      } else {
        // Inserir novo registro
        result = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            name: settings.name || null,
            email: settings.email || null,
            phone: settings.phone || null,
            logo_url: settings.logo_url || null,
            banner_url: settings.banner_url || null,
            primary_color: settings.primary_color || '#3B82F6',
            secondary_color: settings.secondary_color || '#6B7280',
            header_color: settings.header_color || '#FFFFFF',
            font_family: settings.font_family || 'Inter, sans-serif',
            title_color: settings.title_color || '#111827',
            icon_color: settings.icon_color || '#4B5563',
            email_provider: settings.email_provider || 'resend',
            email_api_key: settings.email_api_key || null,
            email_from: settings.email_from || null,
            show_shipping: settings.show_shipping !== undefined ? settings.show_shipping : true,
            show_installments: settings.show_installments !== undefined ? settings.show_installments : true,
            show_delivery_address: settings.show_delivery_address !== undefined ? settings.show_delivery_address : true,
            show_installments_checkout: settings.show_installments_checkout !== undefined ? settings.show_installments_checkout : true,
            show_discount: settings.show_discount !== undefined ? settings.show_discount : true,
            show_old_price: settings.show_old_price !== undefined ? settings.show_old_price : true
          })
      }

      if (result.error) throw result.error

      setMessage('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setMessage(`Erro ao salvar configurações: ${(error as Error).message}`)
    }
  }

  const ImageUploadCard = ({ title, bucket, field, currentUrl, description }: {
    title: string
    bucket: string
    field: keyof UploadingState
    currentUrl?: string
    description: string
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {(currentUrl && currentUrl.trim() !== '') && (
        <div className="mb-4">
          <img src={currentUrl} alt={title} className="w-full h-40 object-cover rounded" />
        </div>
      )}

      <div className="flex items-center space-x-4">
        <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
          <Upload className="h-4 w-4 mr-2" />
          {uploading[field] ? 'Enviando...' : 'Escolher imagem'}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, bucket, field)}
            className="hidden"
            disabled={uploading[field]}
          />
        </label>
        {currentUrl && currentUrl.trim() !== '' && (
          <button
            onClick={() => {
              if (field === 'logo') {
                setSettings(prev => ({ ...prev, logo_url: '' }))
              } else if (field === 'banner') {
                setSettings(prev => ({ ...prev, banner_url: '' }))
              }
            }}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Remover
          </button>
        )}
      </div>
    </div>
  )

  if (!user) {
    return <div>Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-gray-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                <p className="text-sm text-gray-600">Gerencie suas imagens e configurações</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Configurações de Email */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Configurações de Email</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provedor de Email</label>
              <select
                value={settings.email_provider || 'resend'}
                onChange={(e) => setSettings(prev => ({ ...prev, email_provider: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="resend">Resend (Recomendado)</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="aws-ses">AWS SES</option>
                <option value="smtp">SMTP Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email do Remetente</label>
              <input
                type="email"
                value={settings.email_from || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, email_from: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="noreply@suaempresa.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave API</label>
              <input
                type="password"
                value={settings.email_api_key || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, email_api_key: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Sua chave API do provedor de email"
              />
              <p className="text-xs text-gray-500 mt-1">
                A chave API é armazenada de forma segura e usada apenas para envio de emails.
              </p>
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações de Email
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              <input
                type="text"
                value={settings.name || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Nome da sua empresa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </button>
        </div>

        {/* Personalização do Tema */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Personalização do Tema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária (Botões)</label>
              <input
                type="color"
                value={settings.primary_color || '#3B82F6'}
                onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor Secundária</label>
              <input
                type="color"
                value={settings.secondary_color || '#6B7280'}
                onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Cabeçalho</label>
              <input
                type="color"
                value={settings.header_color || '#FFFFFF'}
                onChange={(e) => setSettings(prev => ({ ...prev, header_color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Título</label>
              <input
                type="color"
                value={settings.title_color || '#111827'}
                onChange={(e) => setSettings(prev => ({ ...prev, title_color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor dos Ícones</label>
              <input
                type="color"
                value={settings.icon_color || '#4B5563'}
                onChange={(e) => setSettings(prev => ({ ...prev, icon_color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Tema
          </button>
        </div>

        {/* Upload de Imagens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploadCard
            title="Logo da Empresa"
            bucket="logos"
            field="logo"
            currentUrl={settings.logo_url}
            description="Logo que aparece no catálogo e cabeçalho"
          />

          <ImageUploadCard
            title="Banner Principal"
            bucket="banner"
            field="banner"
            currentUrl={settings.banner_url}
            description="Banner exibido no topo do catálogo"
          />
        </div>

        {/* Configurações do Catálogo */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Configurações do Catálogo</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_shipping"
                checked={settings.show_shipping !== undefined ? settings.show_shipping : true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_shipping: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_shipping" className="ml-2 block text-sm text-gray-900">
                Mostrar informações de frete nos cards dos produtos
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_installments"
                checked={settings.show_installments !== undefined ? settings.show_installments : true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_installments: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_installments" className="ml-2 block text-sm text-gray-900">
                Mostrar informações de parcelamento nos cards dos produtos
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_delivery_address"
                checked={settings.show_delivery_address !== undefined ? settings.show_delivery_address : true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_delivery_address: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_delivery_address" className="ml-2 block text-sm text-gray-900">
                Mostrar campo de endereço de entrega no checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_installments_checkout"
                checked={settings.show_installments_checkout !== undefined ? settings.show_installments_checkout : true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_installments_checkout: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_installments_checkout" className="ml-2 block text-sm text-gray-900">
                Mostrar informações de parcelamento no checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_discount"
                checked={settings.show_discount !== undefined ? settings.show_discount : true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_discount: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_discount" className="ml-2 block text-sm text-gray-900">
                Mostrar desconto do produto (porcentagem)
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_old_price"
                checked={settings.show_old_price !== undefined ? settings.show_old_price : true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_old_price: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_old_price" className="ml-2 block text-sm text-gray-900">
                Mostrar valor antigo cortado
              </label>
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações do Catálogo
          </button>
        </div>

        {/* Seção para Produtos e Marcas */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Gerenciamento de Imagens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Imagens de Produtos</h3>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload de imagens de produtos no bucket "produtos".
                As imagens são associadas aos produtos no cadastro.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Bucket:</strong> produtos<br />
                <strong>Uso:</strong> Imagens dos produtos no catálogo
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Logos de Marcas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload dos logos das marcas no bucket "marcas".
                Os logos aparecem nas categorias do catálogo.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Bucket:</strong> marcas<br />
                <strong>Uso:</strong> Logos das marcas/categorias
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}