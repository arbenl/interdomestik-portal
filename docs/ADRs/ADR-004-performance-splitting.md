# ADR-004: Performance and Code Splitting

## Status

Accepted

## Context

As the application grows, the initial JavaScript bundle size can become a performance bottleneck, leading to slow load times. We need a strategy to keep the initial load small and defer loading code until it's needed.

## Decision

We will implement a multi-layered code-splitting strategy:
1.  **Route-based Splitting**: The primary method of code splitting will be at the route level. All major pages and feature panels will be loaded lazily using `React.lazy()` and wrapped in a `<Suspense>` boundary.
2.  **Dynamic Imports for Heavy Dependencies**: Large, non-essential libraries or modules (especially those only used in development) will be imported dynamically. The Firebase emulator connection logic in `src/firebase.ts` is a key example, as this ensures the emulator code is tree-shaken from production builds.
3.  **Bundle Analysis**: We will use `rollup-plugin-visualizer` to generate a bundle analysis report (`stats.html`) on every production build to monitor bundle size and composition.

## Consequences

-   **Pros**:
    -   **Faster Initial Load**: Users only download the minimal JavaScript required for the initial page, leading to a much faster Time to Interactive (TTI).
    -   **Improved Performance**: On-demand loading of feature panels means the browser has less code to parse and execute upfront.
    -   **Scalability**: The architecture can scale to include many more features without bloating the initial bundle.
-   **Cons**:
    -   There is a small loading state (the `<Suspense>` fallback) when navigating to a lazy-loaded feature for the first time. This can be mitigated with prefetching strategies.
