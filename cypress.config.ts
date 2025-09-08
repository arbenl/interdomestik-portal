import { defineConfig } from "cypress";

const PROJECT_ID = process.env.FB_PROJECT_ID || "demo-interdomestik";
const HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] || "127.0.0.1"; // avoid IPv6 surprises
const FS_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] || process.env.FIRESTORE_PORT || 8085);

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5000",
    video: false,
    retries: 1,
    defaultCommandTimeout: 8000,
    setupNodeEvents(on, _config) {
      async function mustOk(url: string, init?: RequestInit) {
        const r = await fetch(url, init).catch((e) => { throw new Error(`Fetch failed: ${url} -> ${e}`); });
        if (!r.ok) throw new Error(`Emulator responded ${r.status} for ${url}`);
        return r;
      }
      on("task", {
        async assertEmulators() {
          await mustOk(`http://${HOST}:9099/`);
          await mustOk(`http://${HOST}:${FS_PORT}/`);
          // Functions root may 404; we'll validate via seed calls per spec
          await mustOk(`http://localhost:5000/`);
          return true;
        },
        async resetAuth() {
          await mustOk(`http://${HOST}:9099/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
          return true;
        },
        async resetFirestore() {
          await mustOk(`http://${HOST}:${FS_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
          return true;
        },
        // Create a password user in the Auth emulator
        async createUser({ email, password }: { email: string; password: string }) {
          const r = await mustOk(`http://${HOST}:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true })
          });
          const json = await r.json();
          // returns localId, idToken, refreshToken…
          return json;
        },
        // Set custom claims via Auth emulator
        async setCustomClaims({ localId, claims }: { localId: string; claims: Record<string, any> }) {
          // Use projects endpoint accepted by Auth emulator for admin claim updates
          const r = await mustOk(`http://${HOST}:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update?key=fake-key`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              localId,
              customAttributes: JSON.stringify(claims)
            })
          });
          const json = await r.json();
          return json;
        }
      });
    }
  }
});
