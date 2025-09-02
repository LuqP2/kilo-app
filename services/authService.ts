import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result;
}

export async function signOutUser() {
  await signOut(auth);
}