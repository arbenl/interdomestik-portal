# App Check and Captcha — Enablement Runbook

Goal: Reduce abuse of public endpoints and unauthorized access by enabling Firebase App Check on client SDKs and optionally adding a reCAPTCHA validation for the public `verifyMembership` endpoint.

Audience: Admins/maintainers

---

## 1) Client — App Check (reCAPTCHA v3)

Prerequisites: You have a reCAPTCHA v3 site key provisioned for your domain(s).

Steps:

- In Firebase Console → Build → App Check → select your web app → Set up App Check.
- Choose reCAPTCHA v3 (or Enterprise) and register your production domain(s).
- Copy the site key.
- In the frontend, set the Vite env `VITE_APPCHECK_SITE_KEY` to your site key (e.g., in `.env.production`):

```
VITE_APPCHECK_SITE_KEY=your_recaptcha_v3_site_key
```

- Client code automatically initializes App Check if the env is set (see `frontend/src/firebase.ts`).

Enforcement:

- After the client is deployed with App Check, turn on enforcement for Firestore and Functions in Firebase Console (App Check → your app → Enforcement → enable for services). Verify logs before enabling to avoid accidental blocking.

Verification:

- In production, calls to Firestore and callable Functions should include valid App Check tokens. If enforcement is on and tokens are missing, the SDK calls will fail with permission errors.

---

## 2) Public Verify Endpoint — Optional Captcha Gate

The `verifyMembership` HTTP endpoint supports an optional reCAPTCHA verification. When enabled, callers must send a valid captcha token header.

Server setup:

- Set a Functions secret with your reCAPTCHA secret key:

```
firebase functions:secrets:set RECAPTCHA_SECRET
```

- Deploy functions: `firebase deploy --only functions`.

Client/caller behavior:

- Obtain a reCAPTCHA v3 token on the client and send it in the request header `x-recaptcha-token` when calling `/verifyMembership`.
- Example (pseudo):

```js
// get token from grecaptcha.execute('<site_key>', { action: 'verify' })
fetch('/verifyMembership?memberNo=INT-2025-123456', {
  headers: { 'x-recaptcha-token': token },
});
```

Notes:

- Captcha validation is only enforced when `RECAPTCHA_SECRET` is set server-side; otherwise, the endpoint behaves as before (with rate limiting).

---

## 3) Rollback & Troubleshooting

- If App Check breaks client calls, remove `VITE_APPCHECK_SITE_KEY` and redeploy the frontend; then disable enforcement in Console.
- If captcha blocks legitimate verify calls, clear/remove `RECAPTCHA_SECRET` and redeploy functions.
- Logs: use structured logs in Cloud Logging (events: `verify_error`, `verify_captcha_error`, `verify_rate_limited`).

---

## 4) Checklist

- [ ] `VITE_APPCHECK_SITE_KEY` set and deployed
- [ ] App Check tokens observed in logs
- [ ] Enforcement enabled for Firestore + Functions
- [ ] `RECAPTCHA_SECRET` configured (if enabling captcha on verify)
- [ ] Verify client includes `x-recaptcha-token` when captcha enforcement is on
