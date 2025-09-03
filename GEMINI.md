# Interdomestik Member Portal

This document provides a comprehensive overview of the Interdomestik Member Portal, including its architecture, application flow, and development guidelines. It is intended to be a living document for developers and administrators.

## Project Overview

This project is a member portal for the Interdomestik organization, built on Firebase. It provides functionalities for managing members, their memberships, and roles using a cost-optimized and secure serverless architecture.

*   **Frontend:** React (Vite, TypeScript), Tailwind CSS.
*   **Backend:** Node.js with TypeScript (Firebase Cloud Functions).
*   **Database:** Firestore for member data and membership history.
*   **Authentication:** Firebase Authentication with email/password sign-in and custom claims for Role-Based Access Control (RBAC).
*   **Deployment:** Firebase Hosting for the frontend and Firebase Cloud Functions for the backend logic.

## Application Workflow

The application is composed of a React single-page application that connects to backend Cloud Functions to perform operations.

### 1. Onboarding & Profile Management

*   **`/signup` (Sign-up Page):** New users can register with their email and password.
*   **`/signin` (Sign-in Page):** Existing users can sign in.
*   **`/profile` (User Profile):** After login, users are directed here.
    *   Users can view and update their information (name, phone, region).
    *   A digital membership card is displayed, showing the member's name, number, region, and membership validity.
    *   **Backend Connection (`upsertProfile`):** This callable function validates the data, generates a unique `memberNo` for new users, and saves the data to the `/members/{uid}` document in Firestore.

### 2. Membership Viewing

*   **`/membership` (Membership History):** Accessible from the user's profile.
    *   **Direct Firestore Connection:** This page reads the `/members/{uid}/memberships` sub-collection from Firestore to display a history of the user's yearly memberships, including their status (`active`, `expired`) and validity dates.

### 3. Admin Panel

*   **`/admin` (Administration):** A control panel for users with the `admin` role.
    *   **View Users:** Displays a list of all members with their details.
    *   **Activate Membership:** Allows an admin to activate a member's yearly subscription via a modal form. This calls the `startMembership` function.
    *   **Download Reports:** Provides a button to download a CSV file of all members by calling the `exportMembersCsv` function.

### 4. Public Verification

*   **`/verify` (Public Membership Verification):** A public-facing page.
    *   **Backend Connection (`verifyMembership`):** A user can enter a `memberNo` into this page, which calls the `verifyMembership` HTTP-triggered function. The function checks if the membership is valid and active, returning a simple JSON response to the page.

## Backend Cloud Functions Summary

*   `upsertProfile` (Callable): Creates/updates a user profile.
*   `setUserRole` (Callable): Admin-only function to set user roles and permissions.
*   `startMembership` (Callable): Admin-only function to activate a yearly membership.
*   `searchUserByEmail` (Callable): Admin-only function to search for a user by email.
*   `exportMembersCsv` (HTTPS): Admin-only endpoint to download member data.
*   `verifyMembership` (HTTPS): Public endpoint to validate a member number.
*   `dailyExpireMemberships` (Scheduled): Runs daily to expire memberships and send renewal reminders.
*   `seedDatabase` (HTTPS): Test-only endpoint to seed the database with test data, only available in the emulator.

## Local Development

### Prerequisites

*   Node.js (v22+ recommended)
*   Firebase CLI

### Running the Project

1.  **Install root dependencies:** `npm install`
2.  **Install functions dependencies:** `cd functions && npm install`
3.  **Install frontend dependencies:** `cd frontend && npm install`
4.  **Build & Run Emulators:** From the `functions` directory, run `npm run serve`. This command first builds the TypeScript code and then starts the local Firebase emulators for Hosting, Functions, Firestore, and Auth with the project ID `demo-interdomestik`.
5.  **Run Frontend Development Server:** In a separate terminal, from the `frontend` directory, run `npm run dev`.

## Testing

This project has a comprehensive testing strategy:

*   **Backend Unit Tests:** Using Mocha and Chai to test the business logic of individual Cloud Functions. Run with `cd functions && npm test`.
*   **Frontend E2E Tests:** Using Cypress to test user flows and UI interactions. Run with `npm run cypress:open` after starting the emulators and the frontend development server.
*   **Security Rules Unit Tests:** Using `@firebase/rules-unit-testing` to verify Firestore security rules. Run with `npm run test:rules`.
*   **Data Seeding for E2E Tests:** A dedicated `seedDatabase` Cloud Function is used to seed and clean the database before each E2E test run, ensuring test isolation.

## Deployment

*   **Deploy All:** `firebase deploy`
*   **Deploy Functions Only:** `firebase deploy --only functions`
*   **Deploy Hosting Only:** `firebase deploy --only hosting`
