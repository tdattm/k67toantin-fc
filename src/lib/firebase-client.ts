import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const app = getApps().length ? getApp() : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "unconfigured",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "unconfigured.invalid",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "unconfigured",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "unconfigured",
});
export const clientAuth = getAuth(app);
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST && !clientAuth.emulatorConfig)
  connectAuthEmulator(clientAuth, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST, { disableWarnings: true });

export async function authHeaders(): Promise<Record<string, string>> {
  const user = clientAuth.currentUser;
  if (!user) return {};
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}
