import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as net from 'net';

const VERBOSE = process.env.VERBOSE === '1';

const REGIONS = ['Prishtina', 'Gjakova', 'Peja', 'Prizreni'] as const;

type SeedUser = {
  uid: string;
  email: string;
  password?: string;
  claims: Record<string, any>;
  profile: Record<string, any>;
};

function checkEmulatorHealth(port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const onError = (err: Error) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(1500); // 1.5 second timeout
    socket.once('error', onError);
    socket.once('timeout', () => onError(new Error('Connection timed out.')));
    socket.connect(port, host, () => {
      socket.end();
      resolve();
    });
  });
}

async function main() {
  // 1. Set and Validate Emulator Environment
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn('⚠️ FIRESTORE_EMULATOR_HOST not set, defaulting to 127.0.0.1:8080');
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.warn('⚠️ FIREBASE_AUTH_EMULATOR_HOST not set, defaulting to 127.0.0.1:9099');
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-interdomestik';
  initializeApp({ projectId });

  const auth = getAuth();
  const db = getFirestore();

  console.log(`🌱 Seeding data for project: ${projectId}`);

  // 2. Define Deterministic Seed Data
  const usersToSeed: SeedUser[] = [
    // Admin
    {
      uid: 'admin-user-001',
      email: 'admin@example.com',
      password: 'Passw0rd!',
      claims: { role: 'admin', allowedRegions: ['*'] },
      profile: { fullName: 'Admin User', region: 'Prishtina', email: 'admin@example.com', role: 'admin' },
    },
    // Agents
    ...Array.from({ length: 3 }, (_, i) => {
      const id = String(i + 1).padStart(3, '0');
      const regions = i === 0 ? [REGIONS[0], REGIONS[1]] : i === 1 ? [REGIONS[2], REGIONS[3]] : [...REGIONS];
      return {
        uid: `agent-user-${id}`,
        email: `agent${id}@example.com`,
        password: 'Passw0rd!',
        claims: { role: 'agent', allowedRegions: regions },
        profile: { fullName: `Agent ${id}`, primaryRegion: regions[0], email: `agent${id}@example.com`, role: 'agent' },
      };
    }),
    // Members
    ...Array.from({ length: 30 }, (_, i) => {
      const id = String(i + 1).padStart(3, '0');
      const region = REGIONS[i % REGIONS.length];
      return {
        uid: `member-user-${id}`,
        email: `member${id}@example.com`,
        password: 'Passw0rd!',
        claims: { role: 'member' },
        profile: { fullName: `Member ${id}`, region, email: `member${id}@example.com`, role: 'member', status: 'active', createdAt: new Date().toISOString() },
      };
    }),
  ];

  // 3. Seed Users and Data (Idempotent)
  const summary = { created: { admin: 0, agent: 0, member: 0 }, reused: { admin: 0, agent: 0, member: 0 }, errors: [] as string[] };
  const regionCounts: Record<string, number> = {};

  const bulkWriter = db.bulkWriter();

  for (const userData of usersToSeed) {
    const role = userData.claims.role as 'admin' | 'agent' | 'member';
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        summary.reused[role]++;
        if (VERBOSE) console.log(`~ Reusing user: ${userData.email}`);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            uid: userData.uid,
            email: userData.email,
            password: userData.password,
            displayName: userData.profile.fullName,
          });
          summary.created[role]++;
          if (VERBOSE) console.log(`✓ Created user: ${userData.email}`);
        } else {
          throw e;
        }
      }

      await auth.setCustomUserClaims(userRecord.uid, userData.claims);
      if (VERBOSE) console.log(`  ✓ Set claims for ${userData.email}`);

      const profileRef = db.collection('members').doc(userRecord.uid);
      bulkWriter.set(profileRef, userData.profile);
      if (VERBOSE) console.log(`  ✓ Queued profile write for ${userData.email}`);

      if (role === 'member') {
        const region = userData.profile.region as string;
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
    } catch (e: any) {
      const errorMessage = `✗ Failed to process user ${userData.email}: ${e.message as string}`;
      console.error(errorMessage);
      summary.errors.push(errorMessage);
    }
  }

  await bulkWriter.close();
  console.log('✓ All Firestore writes committed.');

  // 4. Print Summary
  console.log('\n--- Seed Summary ---');
  console.table({
    'Admin': { Created: summary.created.admin, Reused: summary.reused.admin },
    'Agents': { Created: summary.created.agent, Reused: summary.reused.agent },
    'Members': { Created: summary.created.member, Reused: summary.reused.member },
  });
  console.log('\nMember Distribution by Region:');
  console.table(regionCounts);

  if (summary.errors.length > 0) {
    console.error('\n🔴 Encountered errors:');
    summary.errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  } else {
    console.log('\n✅ Seed complete.');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('🔴 Seeding failed with unhandled error:');
  console.error(e);
  process.exit(1);
});
