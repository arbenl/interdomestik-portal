# Interdomestik Member Portal

A cost-optimized, secure member management system built with Firebase.

Note: See PROJECT_GUIDE.md for the unified project handbook (architecture, structure, local dev, testing, deployment).

## Overview

The Interdomestik Member Portal is designed to provide a simple, secure member system with self-registration, agent-assisted registration, yearly subscriptions, automated emails with digital membership cards, and future-ready claims functionality. The system is built with strict budget constraints (€0.50/member/year at 1-5k members) and follows a security-first approach.

## Architecture

- **Hosting:** Firebase Hosting with CDN
- **Authentication:** Firebase Auth with custom claims
- **Database:** Firestore (EU region)
- **Functions:** Cloud Functions (Node 20 LTS, europe-west1)
- **Email:** Trigger Email for transactional messaging
- **Frontend:** React + TypeScript (Vite) with Tailwind CSS

## Features

### Core Functionality
- Self-registration with email-link authentication
- Agent-assisted registration (region-limited)
- Yearly subscription management
- Digital membership cards with QR verification
- Automated email notifications
- Role-based access control (member/agent/admin)

### Admin Features
- User role management
- Membership activation and renewal
- **CSV Export:** Admin-only export of members (including active status) via the `exportMembersCsv` HTTP endpoint and a UI button.
- **Dashboard with KPIs:** Includes Tier-1 daily metrics rollups for activations and expirations by region and organization.
- Bulk upload capabilities
- Audit logging

### Security Features
- Email-link + passkey authentication
- Custom claims for role-based access
- Firestore security rules
- PII minimization
- Audit trail for admin actions
- CSP and security headers

## Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI
- Firebase project with Firestore, Auth, and Functions enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   (cd functions && npm install)
   (cd frontend && npm install)
   ```

3. Configure Firebase:
   ```bash
   firebase login
   firebase use your-project-id
   ```

4. Update configuration:
   - Update project ID in `.github/workflows/firebase.yml` if you plan to use that workflow

5. Deploy:
   ```bash
   firebase deploy
   ```

## Configuration

### Environment Variables
Set the following in Firebase Functions config:
- Email provider settings
- Feature flags
- Regional configurations

### Feature Flags
The system uses Firebase Remote Config for feature flags:
- `TRACE_ENABLED`: Control Cloud Trace in production
- `ANALYTICS_TIER`: Switch between Tier 1 and Tier 2 analytics
- `PUSH_ENABLED`: Control web push notifications
- `PASSKEYS_BETA`: Control passkey authentication
- `AGENT_CREATE_ENABLED`: Global kill switch for agent registration

## Development

### Local Development
```bash
cd functions && npm run serve
```

### Testing
```bash
cd frontend && npm test
cd functions && npm test
npm test  # rules tests at repo root
```

### Linting
```bash
npm run lint  # runs frontend + functions linters
```

### Dependency Management

- **Dependabot:** Enabled for the `functions` directory to keep npm dependencies up-to-date.

## Deployment

The project uses GitHub Actions for CI/CD:
- Provides a lightweight CI and manual rollback workflow.
- Pull requests deploy to preview channels
- Main branch deploys to staging
- Tagged releases deploy to production

### Manual Deployment
```bash
firebase deploy --only hosting,functions,firestore:rules
```

### CI Strategy (limited billing)

- Workflows:
  - `CI` (full): lint, frontend unit, functions unit (emulators), rules, and E2E. Heavy jobs are skipped when repo/org variable `CI_LIGHT` is `true` (default). Set `CI_LIGHT=false` to re-enable heavy jobs.
  - `CI Light`: always runs lint + typecheck for frontend/functions; useful while billing for hosted runners is limited.
- While CI heavy jobs are disabled, run heavier checks locally:
  - Functions tests (emulators): `cd functions && npm test`
  - Rules tests: `npm test` (root)
  - E2E: `firebase emulators:exec --only functions,firestore,auth,hosting "npm run cypress:run"`

## Payments

- MVP: Admin-activated memberships with `paymentMethod` and optional `externalRef`.
- Billing page lists `billing/{uid}/invoices` and can simulate a paid invoice via the emulator-friendly `stripeWebhook`.
- Production: Stripe signature verification and idempotency are implemented in `stripeWebhook`.
  - Requires `invoice.payment_succeeded` events with `metadata.uid` set to the Firebase UID.
  - Duplicates are ignored using `webhooks_stripe/{event.id}`.

Setup (production):
- Set Functions secrets:
```
firebase functions:secrets:set STRIPE_SIGNING_SECRET
firebase functions:secrets:set STRIPE_API_KEY
```
- Deploy functions:
```
firebase deploy --only functions
```

Local testing (no signature):
```
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"uid":"<UID>","invoiceId":"inv_test_1","amount":2500,"currency":"EUR"}' \
  http://localhost:5001/demo-interdomestik/europe-west1/stripeWebhook
```

## Cost Optimization

The system is designed with cost-first principles:
- Email-link authentication (no SMS costs)
- Tier 1 rollups for analytics (no BigQuery costs by default)
- Gen2 Cloud Functions with no minimum instances
- Sampled logging in production
- Feature flags for cost-sensitive features

## Security

### Authentication
- Email-link authentication with passkey support
- Custom claims for role-based access
- Token refresh on role changes

### Data Protection
- PII minimization
- Regional access controls for agents
- Audit logging for admin actions
- Firestore security rules

### Headers and CSP
- Content Security Policy
- HSTS, X-Frame-Options, X-Content-Type-Options
- Referrer Policy

## Documentation

- [Architecture Decision Records](docs/adr.md)
- [Operational Runbooks](docs/runbooks.md)
- [Administrator Guide](docs/admin-guide.md)

## Support

Test accounts after seeding (password `password123`):
- member1@example.com
- member2@example.com
- admin@example.com
- agent1@example.com, agent2@example.com, agent3@example.com

For technical issues or questions, refer to the documentation or contact the development team.

## License

MIT License - see LICENSE file for details.
