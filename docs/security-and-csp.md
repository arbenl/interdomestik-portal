# Security and CSP

This document outlines the security model, focusing on Content Security Policy (CSP).

## CSP Strategy

The project employs a two-pronged CSP strategy:

-   **Development**: No CSP is enforced. The `<meta http-equiv="Content-Security-Policy"...>` tag is removed from `index.html` to allow Vite's development server to function correctly (it relies on injecting inline styles for HMR).
-   **Production**: A strict CSP is enforced via the `headers` section of `firebase.json`. This is more secure than a meta tag because it cannot be overridden by injected content.

### Production CSP Directives

The production CSP is configured in `firebase.json` and includes:
-   `default-src 'self'`: Restricts all content to the same origin.
-   `style-src 'self' https://fonts.googleapis.com`: Allows stylesheets from the origin and Google Fonts.
-   `font-src 'self' https://fonts.gstatic.com`: Allows fonts from the origin and Google Fonts.
-   `connect-src 'self' https://firestore.googleapis.com wss://firestore.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com`: Allows connections to the application's origin and necessary Google Cloud services for Firebase Auth and Firestore.

## Secrets Management

-   **No Secrets in Repository**: No API keys, credentials, or other secrets are ever committed to the repository.
-   **Environment Variables**: All secrets are provided via environment variables. The frontend uses `VITE_*` prefixed variables from a `.env.local` file (which is not committed), while the backend functions use the `functions:secrets:set` command.
-   **Principle of Least Privilege**: Firestore security rules and Cloud IAM are configured to grant the minimum necessary permissions for each user role and service.
