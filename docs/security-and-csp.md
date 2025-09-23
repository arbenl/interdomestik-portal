# Security and CSP

This document outlines the security model, focusing on Content Security Policy (CSP).

## CSP Strategy

The project employs a two-pronged CSP strategy:

-   **Development**: No CSP is enforced. The `<meta http-equiv="Content-Security-Policy"...>` tag is removed from `index.html` to allow Vite's development server to function correctly (it relies on injecting inline styles for HMR).
-   **Production**: A strict CSP is enforced via the `headers` section of `firebase.json`. This is more secure than a meta tag because it cannot be overridden by injected content.

### Production CSP Directives

The production CSP is configured in `firebase.json` and includes (summary):
- `default-src 'self'`
- `style-src-elem 'self' https://fonts.googleapis.com` and `style-src-attr 'unsafe-inline'`
- `font-src 'self' https://fonts.gstatic.com`
- `script-src 'self' https://js.stripe.com` (Stripe Payment Element)
- `frame-src https://js.stripe.com https://hooks.stripe.com` (Stripe iframes)
- `img-src 'self' data: blob: https://q.stripe.com` (Stripe beacon)
- `connect-src 'self' https://firestore.googleapis.com wss://firestore.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firebasestorage.googleapis.com https://*.cloudfunctions.net` (Firebase Auth/Firestore/Functions/Storage)

## Secrets Management

-   **No Secrets in Repository**: No API keys, credentials, or other secrets are ever committed to the repository.
-   **Environment Variables**: All secrets are provided via environment variables. The frontend uses `VITE_*` prefixed variables from a `.env.local` file (which is not committed), while the backend functions use the `functions:secrets:set` command.
-   **Principle of Least Privilege**: Firestore security rules and Cloud IAM are configured to grant the minimum necessary permissions for each user role and service.
