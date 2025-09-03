import { defineConfig } from "cypress";

const PROJECT_ID = process.env.FB_PROJECT_ID || "demo-interdomestik";
const HOST = "127.0.0.1"; // use 127.0.0.1 to avoid IPv6 surprises

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5000",
    video: false,
    defaultCommandTimeout: 8000,
    setupNodeEvents(on, _config) {
      on("task", {
        async resetAuth() {
          await fetch(`http://${HOST}:9099/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
          return null;
        },
        async resetFirestore() {
          await fetch(`http://${HOST}:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
          return null;
        },
        // Create a password user in the Auth emulator
        async createUser({ email, password }: { email: string; password: string }) {
          const r = await fetch(`http://${HOST}:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`, {
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
          const r = await fetch(`http://${HOST}:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-key`, {
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