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
          dourado: '#D4AF37',
          douradoClaro: '#FBF5B7',
          douradoEscuro: '#AA8529',
          azulProfundo: '#0b192c',
          azulTemplo: '#1E3E62',
          vermelhoCortejo: '#8B0000',
          cianoSigma: '#00E5FF',
          surface: '#080808',
          inactive: '#3A3A3A',
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
