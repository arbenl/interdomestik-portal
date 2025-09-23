# Emulator

This document describes how to use the Firebase emulator suite for local development.

## Starting the Emulator

To start the Firebase emulator, run the following command:

```bash
firebase emulators:start
```

This will start the emulators for Authentication, Firestore, and Functions on their default ports.

## Seeding Data

The application provides a set of emulator utilities for seeding the database with test data.

-   **Seed Data:** Click the "Seed Data" button in the "Emulator Utilities" panel on the admin page to populate the database with test users, including an admin and an agent.
-   **Clear Data:** Click the "Clear Data" button to wipe the emulator database.

## Ports

-   **Authentication:** `9099`
-   **Firestore:** `8080`
-   **Functions:** `5001`
-   **UI:** `4000`

## Troubleshooting

-   **`Error: Could not load the default credentials`**: Make sure you have authenticated with the Firebase CLI by running `firebase login`.
-   **`Error: Port already in use`**: Make sure no other processes are running on the emulator ports.
