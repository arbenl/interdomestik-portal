// src/config/env.ts

// All VITE_ vars are initially string | undefined.
const env = import.meta.env;

interface AppConfig {
  useEmulators: boolean;
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    appId?: string;
  };
  emulators: {
    auth: {
      host: string;
      port: number;
    };
    firestore: {
      host: string;
      port: number;
    };
    functions: {
      host: string;
      port: number;
    };
  };
}

export const config: AppConfig = {
  useEmulators: env.VITE_USE_EMULATORS === 'true',
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  },
  emulators: {
    auth: {
      host: env.VITE_EMU_AUTH_HOST as string || '127.0.0.1',
      port: Number(env.VITE_EMU_AUTH_PORT) || 9099,
    },
    firestore: {
      host: env.VITE_EMU_FIRESTORE_HOST as string || '127.0.0.1',
      port: Number(env.VITE_EMU_FIRESTORE_PORT) || 8080,
    },
    functions: {
      host: env.VITE_EMU_FUNCTIONS_HOST as string || '127.0.0.1',
      port: Number(env.VITE_EMU_FUNCTIONS_PORT) || 5001,
    },
  },
};

// Production guard: ensure all required keys are present.
if (import.meta.env.PROD) {
  for (const [key, value] of Object.entries(config.firebase)) {
    if (!value) {
      throw new Error(`Missing Firebase config key: ${key}. Please set VITE_FIREBASE_${key.toUpperCase()} in your environment.`);
    }
  }
}