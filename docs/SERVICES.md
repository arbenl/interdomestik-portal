# Services

This document describes the services used in the application.

## `functionsClient.ts`

This service, located in `src/services/functionsClient.ts`, provides a typed wrapper around `httpsCallable` from the Firebase Functions SDK.

### `callFn`

The `callFn` helper function allows you to create a typed callable function reference.

#### Example

```typescript
import { callFn } from './services/functionsClient';

interface RequestData {
  email: string;
}

interface ResponseData {
  uid: string;
}

const searchUserByEmail = callFn<RequestData, ResponseData>(
  'searchUserByEmail'
);

async function findUser(email: string) {
  const result = await searchUserByEmail({ email });
  return result.data.uid;
}
```

## `firestoreAdmin.ts`

This service, located in `src/services/firestoreAdmin.ts`, will contain admin-specific Firestore operations, such as complex queries and mutations that are only accessible to admin users.
