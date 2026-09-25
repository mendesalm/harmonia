/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primaria: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0070f3',
          600: '#0056b3',
          700: '#003d80',
          800: '#0a192f',
          900: '#060d17',
        },
        macaonico: {
          dourado: '#DDB96B',
          douradoClaro: '#FDE68A',
          douradoEscuro: '#785012',
          azulProfundo: '#0b172e',
          azulTemplo: '#070e1c',
          vermelhoCortejo: '#8B0000',
          cianoSigma: '#DDB96B',
          surface: '#050508',
          inactive: '#64748B',
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(90deg, #D4AF37 0%, #FBF5B7 50%, #D4AF37 100%)',
      }
    }
  },
  plugins: [],
}
