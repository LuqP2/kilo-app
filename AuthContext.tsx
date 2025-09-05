import React, { createContext, useContext, useEffect, useState, ReactNode, startTransition } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebaseConfig.ts";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig.ts";
import { UserProfile } from './types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  userProfile: UserProfile | null;
  updateUserProfile: (newData: Partial<UserProfile>) => Promise<void>;
  getIdToken?: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  userProfile: null,
  updateUserProfile: async () => {},
  getIdToken: async () => null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Função para atualizar o perfil do usuário no Firestore e localmente
  const updateUserProfile = async (newData: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      // Enviar dados para validação no backend
      const token = await currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_BASE || ''}/api/updateUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profileData: newData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar perfil');
      }

      // Se passou na validação, atualizar estado local
      setUserProfile((prev) => ({ ...(prev as any), ...newData } as UserProfile));
    } catch (e) {
      console.error("Erro ao atualizar perfil do usuário:", e);
      throw e; // Re-throw para que o componente possa tratar o erro
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.error('Failed to get ID token', e);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
  console.debug('[Auth] onAuthStateChanged ->', { uid: user ? user.uid : null });
      if (user) {
        console.debug('[Auth] Setting currentUser and loading=false');
        
        // Use startTransition to ensure state updates are batched properly
        startTransition(() => {
          setCurrentUser(user);
          setLoading(false);
        });
        
        console.debug('[Auth] State updated - currentUser:', !!user, 'loading:', false);

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          console.debug('[Auth] Found existing user profile');
          startTransition(() => {
            setUserProfile(docSnap.data() as UserProfile);
          });
        } else {
          console.debug('[Auth] Creating new user profile');
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            flavorProfile: null,
            restrictions: [],
            myKitchen: {
              appliances: [],
              utensils: [],
            },
            generationsUsed: 0,
            isPro: false,
          };
          await setDoc(userRef, newProfile as any);
          startTransition(() => {
            setUserProfile(newProfile);
          });
        }
      } else {
        console.debug('[Auth] No user, setting loading=false');
        startTransition(() => {
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
        });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, userProfile, updateUserProfile, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
