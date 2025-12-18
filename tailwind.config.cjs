/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Se um dia quiser trocar a fonte padrão sem Google Fonts, seria aqui:
      // fontFamily: { sans: ['SuasFontesLocais', 'sans-serif'] },
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        header: {
          bg: 'var(--header-bg)',
          text: 'var(--header-text)',
        },
      },
    },
  },
  plugins: [],
};
