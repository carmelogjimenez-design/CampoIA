/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1D1D1F',        // negro Apple (texto)
        paper: '#FFFFFF',
        canvas: '#F5F5F7',     // gris roto Apple (fondo principal)
        canvas2: '#FAFAFA',
        line: '#E8E8ED',       // divisores sutiles
        'line-strong': '#D2D2D7',
        sub: '#6E6E73',        // texto secundario Apple
        muted: '#86868B',      // texto terciario Apple
        faint: '#B0B0B8',
        // aliases antiguos → monocromo (para no romper componentes previos)
        'campo-violet': '#1D1D1F',
        'campo-magenta': '#1D1D1F',
        'campo-blue': '#1D1D1F',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.028em',
        tighter2: '-0.018em',
        eyebrow: '0.06em',
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '10px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        apple: '0 1px 2px rgba(0,0,0,0.03), 0 6px 20px -6px rgba(0,0,0,0.08)',
        'apple-lg': '0 2px 4px rgba(0,0,0,0.04), 0 16px 40px -12px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
