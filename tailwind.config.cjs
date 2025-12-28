/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Mantido para o Dashboard, embora o Catálogo seja forçado para Light
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Roboto Mono',
          'monospace',
        ],
      },
      colors: {
        // CONFIGURAÇÃO DE CORES DINÂMICAS COM OPACIDADE
        primary: {
          // O marcador <alpha-value> permite que o Tailwind use classes como bg-primary/50
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary-rgb) / <alpha-value>)',
          foreground: 'var(--secondary-foreground)',
        },
        header: {
          // Se o header-bg também tiver uma versão RGB no seu theme.ts:
          bg: 'rgb(var(--header-bg-rgb) / <alpha-value>)',
          text: 'var(--header-text)',
        },
      },
    },
  },
  plugins: [
    // Plugin para esconder scrollbar
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
};
