import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        // Fluid typography using clamp() for responsive scaling
        // scales from mobile (320px) to desktop (1920px)
        xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',      // 12px → 14px
        sm: 'clamp(0.875rem, 0.8125rem + 0.3125vw, 1rem)',    // 14px → 16px
        base: 'clamp(1rem, 0.9375rem + 0.3125vw, 1.125rem)',  // 16px → 18px
        lg: 'clamp(1.125rem, 1.0313rem + 0.4688vw, 1.25rem)', // 18px → 20px
        xl: 'clamp(1.25rem, 1.125rem + 0.625vw, 1.5rem)',     // 20px → 24px
        '2xl': 'clamp(1.5rem, 1.3125rem + 0.9375vw, 1.875rem)',   // 24px → 30px
        '3xl': 'clamp(1.875rem, 1.5938rem + 1.4063vw, 2.25rem)',  // 30px → 36px
      },
    },
  },
  plugins: [
    forms({
      strategy: 'class', // Only apply forms plugin to elements with form-* classes
    }),
  ],
} satisfies Config
