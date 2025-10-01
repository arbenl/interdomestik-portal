# UI and Theming

This document covers the standards for UI components, styling, and notifications.

## Tailwind CSS

The UI is styled exclusively with Tailwind CSS.

- **Configuration**:
  - `tailwind.config.ts`: The `content` array is configured with specific globs to scan all `.tsx` files in `src`, `pages`, `components`, and `features`.
  - `postcss.config.cjs`: Configured to use `tailwindcss` and `autoprefixer`.
- **Global Styles**:
  - `src/index.css`: This file contains the required `@tailwind` directives (`base`, `components`, `utilities`) and is imported once in `src/main.tsx`.
- **Tokens**: The project uses standard Tailwind classes. If a design system like shadcn/ui were to be adopted, its color and spacing tokens (e.g., `text-muted-foreground`) would be defined in the `tailwind.config.ts` theme extension.

## Sonner Toasts (Notifications)

Notifications are handled by the [Sonner](https://sonner.emilkowal.ski/) library.

- **Adapter**: A custom hook, `useToast` (`src/components/ui/useToast.ts`), provides a simple, consistent API for dispatching toasts. It acts as an adapter to the underlying `sonner` library.
- **Usage**:

  ```typescript
  import { useToast } from '@/components/ui/useToast';

  const { push } = useToast();

  push({ type: 'success', message: 'Profile updated successfully!' });
  ```

## Content Security Policy (CSP) in Development

During development (`pnpm dev`), Vite's Hot Module Replacement (HMR) works by injecting styles as `<style>` tags into the document head. A strict production CSP would block this. To solve this:

- The CSP `<meta>` tag has been **removed** from `index.html`.
- For production, a strict CSP is applied via hosting headers in `firebase.json`. This is the recommended approach as it is more secure and doesn't interfere with the development server.
