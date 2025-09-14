# Security

This document provides an overview of the security model for the application.

## Client/Server Trust Boundaries

The application follows a standard client/server trust model. The client is untrusted, and all sensitive operations are performed on the server (i.e., in Firebase Functions).

## Firebase ID Tokens

Authentication is handled by Firebase Authentication. When a user signs in, they are issued a Firebase ID token. This token is sent with every request to the backend and is used to verify the user's identity.

## Custom Claims

User roles are managed using Firebase custom claims. The `role` claim is set on the user object on the backend and is used to control access to protected resources.

## Firestore Rules

Firestore rules are used to secure the database. The rules are located in the `firestore.rules` file.

### Example Rule

This rule allows only admin users to read and write to the `metrics` collection:

```
match /metrics/{metricId} {
  allow read, write: if request.auth.token.isAdmin == true;
}
```

## Token Refresh

The `AuthProvider` component automatically handles token refresh. If a user's ID token expires, it will be automatically refreshed in the background.
