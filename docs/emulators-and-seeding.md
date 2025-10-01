# Emulators and Seeding

This project is designed for an emulator-first development workflow to ensure a consistent and reproducible environment.

## Deterministic Seeding

The seed script (`scripts/emulator/seed.ts`) populates the Firebase emulators with a fixed, deterministic dataset.

- **Users**:
  - **1 Admin**: `admin@example.com` (Password: `Passw0rd!`)
  - **3 Agents**: `agent001@example.com` through `agent003@example.com` (Password: `Passw0rd!`)
  - **30 Members**: `member001@example.com` through `member030@example.com` (Password: `Passw0rd!`)
- **Claims**: Each user is created with the appropriate custom claims (`role`, `allowedRegions`).
- **Firestore Data**: Corresponding profile documents are created in the `members` collection with stable UIDs.
- **Region Distribution**: The 30 members are distributed in a round-robin fashion across the four Kosovo regions: `Prishtina`, `Gjakova`, `Peja`, and `Prizreni`.
- **Idempotency**: The script is safe to run multiple times. It checks if a user already exists by email before attempting to create them, and it always overwrites custom claims and Firestore profiles to ensure they match the canonical seed data.

## Running the Seed Script

There are three primary ways to run the seed script:

1.  **Persistent Emulators**: (Recommended for active development)
    - Terminal A: `pnpm dev:emu` (Starts and leaves the emulators running)
    - Terminal B: `pnpm dev:seed` (Seeds the running emulators)

2.  **One-Shot Seed**:
    - `pnpm emu:seed` (Starts the emulators, runs the seed script, and shuts them down automatically)

3.  **Smart Seeding**:
    - `pnpm dev:seed` (This is a smart script. If it detects the emulators are already running, it seeds them directly. If not, it will run the one-shot `emu:seed` command for you.)

## Troubleshooting

- **Port Conflicts**: The emulators are configured to run on fixed ports (defined in `firebase.json`). If a process is already using one of these ports, the `dev:seed` wrapper script will detect this, find the next available free ports, write a temporary config file, and run the emulators there.
