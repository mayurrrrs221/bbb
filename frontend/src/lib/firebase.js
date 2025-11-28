import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initializeApp,
  getApps,
  FirebaseApp,
} from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "mock.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "mock-project",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "mock.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123:web:abc",
};

let appInstance;
if (!getApps().length) {
  appInstance = initializeApp(firebaseConfig);
} else {
  appInstance = getApps()[0];
}

export const app = appInstance;
export const auth = getAuth(appInstance);

const AuthContext = createContext({
  user: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { user: cred.user, error: '' };
  } catch (error) {
    return { user: null, error: error.message || 'Failed to sign in' };
  }
}

export async function signUp(email, password, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    return { user: cred.user, error: '' };
  } catch (error) {
    return { user: null, error: error.message || 'Failed to sign up' };
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return { user: cred.user, error: '' };
  } catch (error) {
    return { user: null, error: error.message || 'Failed to sign in with Google' };
  }
}

export async function logOut() {
  await signOut(auth);
}