"use client";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { clientAuth } from "./firebase-client";
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(clientAuth, current => { setUser(current); setReady(true); }), []);
  return { user, ready };
}
