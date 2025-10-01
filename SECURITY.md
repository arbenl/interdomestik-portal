# Security Policy

We take security seriously and appreciate reports that help keep users safe.

## Reporting a Vulnerability

- Email: security@interdomestik.app (or support@interdomestik.app)
- Alternative: Open a private advisory via GitHub Security Advisories

Please include:

- A clear description of the issue and potential impact
- Steps to reproduce (proof-of-concept if possible)
- Affected versions/commit(s)

We will acknowledge your report within 72 hours and keep you informed of the
status and expected timelines. Please do not disclose publicly until we have
released a fix or mutually agree on disclosure timing.

## Scope

- Frontend (`frontend/`)
- Cloud Functions (`functions/`)
- Firestore rules and indexes
- CI/CD workflows

## Secure Development Notes

- Emulator-first local development; never commit secrets.
- Use least-privilege Firebase roles and custom claims for RBAC.
- Keep dependencies up to date; enable Dependabot alerts in GitHub.

Thank you for helping make Interdomestik more secure.
