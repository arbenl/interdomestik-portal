# Performance and Bundling

This document covers strategies for maintaining a fast and efficient frontend application.

## Code Splitting

- **Lazy-Loaded Panels**: All major feature panels in both the Admin and Portal sections are lazy-loaded using `React.lazy`. This means the JavaScript for a specific feature is only downloaded when the user navigates to it, keeping the initial bundle size small.
- **Dynamic Firebase Imports**: The `firebase.ts` file uses dynamic `import()` statements to load the emulator connection logic only in development. This ensures that the emulator-specific code is tree-shaken from production builds, reducing the final bundle size.

## Firestore Lite

For read-only queries where offline persistence is not required, the project can be optimized by using `firebase/firestore/lite`. This version of the Firestore SDK is significantly smaller than the full version.

**Guideline**: If a feature panel only reads data and does not need offline support, consider creating a separate, lite Firestore instance for its services.

## Bundle Analysis

You can analyze the contents of the production bundle to identify large or unnecessary modules.

1.  **Generate Stats**:
    ```bash
    pnpm -F frontend build
    ```
2.  **View Report**: This will generate a `frontend/stats.html` file. Open it in your browser to see a visual representation of the bundle.

**Budget**: The target for the initial JavaScript bundle size is **under 350 KB (gzipped)**. Use the bundle analyzer to ensure new dependencies do not significantly increase this size.
