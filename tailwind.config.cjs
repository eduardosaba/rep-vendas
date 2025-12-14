/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <--- OBRIGATÓRIO para alternar temas
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // CORES DINÂMICAS (Vêm do Banco -> CSS Variables)
        primary: {
          DEFAULT: 'var(--primary)', // A cor do fundo do botão
          foreground: 'var(--primary-foreground)', // A cor do texto (Preto ou Branco)
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        // Variáveis para fundos específicos se desejar
        header: {
          bg: 'var(--header-bg)',
          text: 'var(--header-text)',
        },
      },
    },
  },
  plugins: [],
};
