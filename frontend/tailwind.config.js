/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'sigma-gold': 'linear-gradient(to right, #C6AB6A, #D1A958, #EBCD79)',
        'gold-gradient': 'linear-gradient(90deg, #D4AF37 0%, #FBF5B7 50%, #D4AF37 100%)',
      },
      colors: {
        sigma: {
          bg: '#070F1E',        /* Fundo principal da aplicação (Azul mais escuro) */
          surface: '#0A1428',   /* Fundo de cards padrão (Azul escuro) */
          elevated: '#0E1C36',  /* Fundo de cabeçalhos/modais (Azul médio) */
          border: '#1E325C',    /* Bordas de divisões */
          accent: '#facc15',    /* Dourado ação (Yellow-400) */
          muted: '#64748b'      /* Texto secundário (Slate-500) */
        },
        macaonico: {
          bg: '#070F1E',
          surface: '#0A1428',
          elevated: '#0E1C36',
          dourado: '#DDB96B',
          inactive: '#64748b',
          cianoSigma: '#00E5FF',
        },
        primaria: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#0A1428',
          900: '#070F1E',
        }
      }
    },
  },
  plugins: [],
}


