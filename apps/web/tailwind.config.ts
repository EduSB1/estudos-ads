import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        borda: 'hsl(var(--borda))',
        fundo: 'hsl(var(--fundo))',
        superficie: 'hsl(var(--superficie))',
        texto: 'hsl(var(--texto))',
        suave: 'hsl(var(--suave))',
        destaque: 'hsl(var(--destaque))',
        'destaque-texto': 'hsl(var(--destaque-texto))',
        perigo: 'hsl(var(--perigo))',
        sucesso: 'hsl(var(--sucesso))',
        atencao: 'hsl(var(--atencao))',
      },
      borderRadius: { lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [animate],
} satisfies Config;
