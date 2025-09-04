import { auth } from "../firebaseConfig.ts";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Login com Google: volta para popup com tratamento melhor de erros COOP
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    console.debug('[authService] Starting signInWithPopup...');
    const result = await signInWithPopup(auth, provider);
    console.debug('[authService] signInWithPopup success:', { uid: result.user.uid });
    return result;
  } catch (e: any) {
    console.error('[authService] signInWithPopup failed', e);
    // Re-throw para que o componente possa tratar
    throw e;
  }
}

// Logout
export async function signOutUser() {
  return await signOut(auth);
}
