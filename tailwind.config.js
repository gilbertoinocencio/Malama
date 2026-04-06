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
        headline: ['Lexend', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        lexend: ['Lexend', 'sans-serif'],
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
        "primary": "#1a6272",
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

        // Stitch Onboarding Specific (MD3 Theme)
        "surface-container-highest": "#e2e3df",
        "on-background": "#1a1c1a",
        "on-primary-container": "#90d6e4",
        "on-tertiary": "#ffffff",
        "on-error-container": "#93000a",
        "secondary-fixed-dim": "#66dd8b",
        "on-secondary-container": "#00743a",
        "on-secondary": "#ffffff",
        "surface-container": "#edeeea",
        "outline": "#6f797b",
        "secondary-container": "#83fba5",
        "on-error": "#ffffff",
        "inverse-surface": "#2e312f",
        "inverse-primary": "#8bd2df",
        "on-surface-variant": "#3f484a",
        "error": "#ba1a1a",
        "on-secondary-fixed-variant": "#005227",
        "tertiary-container": "#7d491f",
        "surface": "#f9faf6",
        "on-surface": "#1a1c1a",
        "primary-fixed-dim": "#8bd2df",
        "surface-tint": "#156874",
        "tertiary-fixed": "#ffdcc5",
        "surface-container-high": "#e7e9e5",
        "on-tertiary-fixed-variant": "#6b3a11",
        "tertiary-fixed-dim": "#ffb783",
        "on-primary-fixed": "#001f24",
        "secondary": "#006d36",
        "on-primary-fixed-variant": "#004e59",
        "surface-dim": "#d9dad7",
        "on-tertiary-fixed": "#301400",
        "on-primary": "#ffffff",
        "background": "#f9faf6",
        "primary-container": "#005f6b",
        "tertiary": "#613309",
        "error-container": "#ffdad6",
        "surface-container-low": "#f3f4f0",
        "inverse-on-surface": "#f0f1ed",
        "surface-container-lowest": "#ffffff",
        "primary-fixed": "#a7eefc",
        "surface-variant": "#e2e3df",
        "on-tertiary-container": "#ffbd8f",
        "secondary-fixed": "#83fba5",
        "on-secondary-fixed": "#00210c",
        "surface-bright": "#f9faf6",
        "outline-variant": "#bec8ca",

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

        // Doctor Portal Specific
        "doctor-sidebar": "#1A1A1A",
        "doctor-content": "#F8F9FA",
        "doctor-accent": "#2ECC71",
        "doctor-accent-hover": "#27ae60",
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
