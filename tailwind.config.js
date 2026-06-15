/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // HUD / cockpit palette
        base: '#05080a',        // near-black background
        panel: '#0b1013',       // panel surface
        'panel-2': '#0e1518',   // raised panel
        grid: '#13201d',        // oscilloscope grid lines
        line: '#1c2a28',        // hairline borders
        term: '#00ff66',        // terminal green (dado principal)
        'term-dim': '#0a8f43',  // dim green
        'term-label': '#1a5c33',// verde escuro p/ labels de painel
        amber: '#ffb000',       // warning amber
        danger: '#ff4136',      // alert red
        cyan: '#37e6ff',        // secondary accent
        muted: '#5c7068',       // muted green-gray text
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', '"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 8px rgba(0,255,102,0.45), 0 0 2px rgba(0,255,102,0.7)',
        'glow-amber': '0 0 8px rgba(255,176,0,0.45)',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.2' } },
        sweep: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        flicker: { '0%,100%': { opacity: '1' }, '92%': { opacity: '1' }, '94%': { opacity: '0.6' }, '96%': { opacity: '1' } },
        'alarm-pulse': {
          '0%,100%': { backgroundColor: 'rgba(255,65,54,0.08)', boxShadow: '0 0 0 rgba(255,65,54,0)' },
          '50%': { backgroundColor: 'rgba(255,65,54,0.22)', boxShadow: '0 0 14px rgba(255,65,54,0.35)' },
        },
      },
      animation: {
        blink: 'blink 1.4s steps(2,end) infinite',
        sweep: 'sweep 3.5s linear infinite',
        flicker: 'flicker 6s linear infinite',
        'alarm-pulse': 'alarm-pulse 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
