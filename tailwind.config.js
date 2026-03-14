/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        display: ['Manrope', 'sans-serif'],
        spline: ['Spline Sans', 'sans-serif'],
        libre: ['Libre Baskerville', 'serif'],
        epilogue: ['Epilogue', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        // NURA Brand Palette (Light Mode)
        "nura-bg": "#FDFBF9",       // Off-white warmer
        "nura-card": "#FFFFFF",     // White
        "nura-main": "#1C1917",     // Soft Black (Stone 900)
        "nura-muted": "#57534E",    // Brown/Stone (Stone 500)
        "nura-petrol": "#1F4E5F",   // Petroleum Blue
        "nura-petrol-light": "#E0F2F1", // Pastel Petrol
        "nura-brown": "#8C6A4B",    // Classic Brown
        "nura-pastel-orange": "#F2EBE6",
        "nura-border": "#E7E5E4",   // Stone 200

        // Flow Dashboard Specific
        "primary": "#11c4d4",
        "primary-old": "#0a90bd",
        "background-light": "#FDFBF9", // Updated to Nura Off-white
        "background-dark": "#102022",
        "surface-dark": "#1a2c2e",
        "surface-light": "#ffffff",
        "accent-protein": "#FFB7B2",
        "accent-carbs": "#B2F7EF",
        "accent-fat": "#FDFD96",

        // Profile Specific (Earth Tones)
        "profile-primary": "#C6A87C", // Adjusted to Gold/Bronze
        "profile-bg": "#1C1917",
        "profile-surface": "#292524",
        "profile-muted": "#78716C",

        // Hydration Specific
        "hydro-primary": "#d47311",
        "hydro-bg-light": "#f8f7f6",
        "hydro-bg-dark": "#221910",
        "hydro-petrol": "#103e4a",
        "hydro-petrol-light": "#487380",
        "hydro-beige": "#eaddcf",

        // Quarterly Analysis Specific
        "analysis-primary": "#1F4E5F",
        "analysis-paper": "#FDFBF9",
        "analysis-text": "#1C2426",
        "analysis-brown": "#4A3B32",
        "analysis-accent": "#CBA183",

        // Daily Journal Specific
        "journal-primary": "#205E69",
        "journal-accent": "#9C6644",
        "journal-accent-light": "#F2EBE6",
        "journal-bg": "#F9F8F6",
        "journal-bg-dark": "#12191C",
        "journal-surface": "#FFFFFF",
        "journal-surface-dark": "#1A2326",
        "journal-text": "#1C2426",
        "journal-text-dark": "#E3E8EB",
        "journal-muted": "#78716C",
        "journal-border": "#DDD6CE",
        "journal-border-dark": "#2A3538",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideUp: {
          'from': { transform: 'translateY(100%)' },
          'to': { transform: 'translateY(0)' },
        },
        slideDown: {
          'from': { transform: 'translateY(-100%)' },
          'to': { transform: 'translateY(0)' },
        },
        scaleIn: {
          'from': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
}
