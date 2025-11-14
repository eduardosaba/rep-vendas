import './globals.css'
import { Metadata } from 'next'
import { ToastProvider } from '../hooks/useToast'
import { ToastContainer } from '../components/ToastContainer'

export const metadata: Metadata = {
  title: 'Rep-Vendas',
  description: 'Sistema SaaS para catálogo virtual e dashboard de vendas',
  icons: {
    icon: '/favicon.svg',
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-br">
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  )
}