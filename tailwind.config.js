/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up':       'fadeSlideUp 0.55s ease-out both',
        'fade-up-delay': 'fadeSlideUp 0.55s ease-out 0.2s both',
        'fade-down':     'fadeSlideDown 0.5s ease-out both',
        'float':         'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
