/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'title': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'code': ['Fira Code', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--tw-prose-body)',
            fontFamily: 'var(--font-body)',
            h1: {
              color: 'var(--tw-prose-headings)',
              fontSize: '2.5rem',
              marginTop: '0.5em',
              marginBottom: '0.5em',
              fontFamily: 'var(--font-title)',
            },
            h2: {
              color: 'var(--tw-prose-headings)',
              marginTop: '1.5em',
              marginBottom: '0.5em',
              fontFamily: 'var(--font-title)',
            },
            pre: {
              backgroundColor: 'transparent',
              color: 'var(--tw-prose-pre-code)',
              fontFamily: 'var(--font-code)',
            },
            code: {
              color: 'var(--tw-prose-code)',
              backgroundColor: 'var(--tw-prose-pre-bg)',
              borderRadius: '0.25rem',
              padding: '0.2em 0.4em',
              fontFamily: 'var(--font-code)',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      },
    },
  },
  plugins: [
    require("daisyui"),
    require('@tailwindcss/typography'),
  ],
  daisyui: {
    themes: [
      "night",
      "synthwave",      // Retro-futuristic dark theme
      "cyberpunk",      // High-contrast colorful theme
      "dracula",        // Dark purple theme
      "forest",         // Dark green theme
      "luxury",         // Dark gold theme
      "business",       // Professional light theme
      "corporate"       // Clean light theme
    ],
    darkTheme: "night",
    base: true,
    styled: true,
    utils: true,
  },
}

