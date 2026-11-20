/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        anya: {
          bg: '#F6F5FC',
          canvas: '#EAE7F4',
          surface: '#FFFFFF',
          soft: '#EEEBFA',
          softHover: '#E3DDF8',
          border: '#E4E0F5',
          primary: '#6B3EE8',
          primaryHover: '#592ED4',
          primaryDeep: '#4C24BA',
          primaryLight: '#9D7BF5',
          ink: '#171426',
          muted: '#4B4666',
          success: '#157F56',
          warning: '#A65D03',
          danger: '#C62828',
        },
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(45, 29, 102, 0.06)',
        cta: '0 10px 24px -6px rgba(107, 62, 232, 0.42)',
        phone: '0 30px 70px -15px rgba(23, 20, 38, 0.28), 0 0 0 1px rgba(255,255,255,0.2)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
