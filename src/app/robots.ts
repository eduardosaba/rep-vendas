import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/catalogo/',
          '/demo',
          '/documentacao',
          '/suporte',
          '/termos',
          '/privacidade',
        ],
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/auth/',
          '/login',
          '/register',
          '/onboarding',
          '/checkout/',
          '/cart',
          '/favorites',
          '/dev/',
          '/_actions/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
