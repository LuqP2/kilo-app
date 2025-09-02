import { auth } from "../firebaseConfig.ts";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Login com Google
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

// Logout
export async function signOutUser() {
  return await signOut(auth);
}
