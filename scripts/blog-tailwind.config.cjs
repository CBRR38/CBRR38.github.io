// Build with Tailwind 3.4.17, @tailwindcss/forms 0.5.10 and
// @tailwindcss/container-queries 0.1.1 from the repository root.
// npx tailwindcss -c scripts/blog-tailwind.config.cjs -i scripts/blog-layout.css -o blog-layout.css --minify
module.exports = {
  content: ['./index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-bright': '#f9f9fc',
        'on-surface': '#2d3748',
        'on-surface-variant': '#4a5568',
        'outline-variant': '#e2e8f0',
        'primary': '#4a5568',
        'on-primary': '#ffffff',
        'surface-variant': '#edf2f7'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px'
      },
      fontFamily: {
        heading: ['Inter', 'Noto Sans SC', 'sans-serif'],
        body: ['Inter', 'Noto Sans SC', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
};
