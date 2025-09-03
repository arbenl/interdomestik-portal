// cypress.config.ts
import { defineConfig } from "cypress";

const HOST = "127.0.0.1";
const PROJECT_ID = process.env.FB_PROJECT_ID || "demo-interdomestik";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5000",
    video: false,
    setupNodeEvents(on) {
      on("task", {
        async resetAuth() {
          await fetch(`http://${HOST}:9099/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
          return null;
        },
        async resetFirestore() {
          await fetch(`http://${HOST}:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
          return null;
        },
        async createUser({ email, password }: { email: string; password: string }) {
          const r = await fetch(`http://${HOST}:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true })
          });
          return r.json();
        },
      });
    },
  },
});