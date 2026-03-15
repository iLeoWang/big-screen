/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'tech-blue': '#0B5CFF',
                'tech-cyan': '#23CEFD',
                'tech-orange': '#FF8A00',
                'tech-red': '#FF3B3B',
                'dark-blue': '#0A1929',
                'dark-panel': '#0F2D4A',
                'panel-border': '#1E90FF',
            },
            fontSize: {
                'title': '1.75rem',
                'subtitle': '1.25rem',
                'data': '2.5rem',
            },
            spacing: {
                '18': '4.5rem',
                '72': '18rem',
                '84': '21rem',
                '96': '24rem',
            },
            borderWidth: {
                '1': '1px',
            },
            boxShadow: {
                'glow': '0 0 10px rgba(35, 206, 253, 0.5)',
                'glow-sm': '0 0 6px rgba(35, 206, 253, 0.3)',
                'glow-md': '0 0 16px rgba(35, 206, 253, 0.4)',
                'glow-lg': '0 0 24px rgba(35, 206, 253, 0.5), 0 0 6px rgba(35, 206, 253, 0.3)',
                'panel': '0 0 15px rgba(30, 144, 255, 0.3)',
                'panel-hover': '0 0 20px rgba(35, 206, 253, 0.2), 0 4px 16px rgba(0, 0, 0, 0.3)',
                'inner-glow': 'inset 0 0 20px rgba(35, 206, 253, 0.06)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
                'border-breathe': 'border-breathe 3s ease-in-out infinite',
                'data-pulse': 'data-pulse 2s ease-in-out infinite',
            },
            height: {
                'screen-minus-header': 'calc(100vh - 65px)',
            },
            backgroundImage: {
                'tech-grid': 'linear-gradient(rgba(35, 206, 253, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(35, 206, 253, 0.03) 1px, transparent 1px)',
                'tech-radial': 'radial-gradient(circle, rgba(35, 206, 253, 0.1) 0%, transparent 70%)',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
