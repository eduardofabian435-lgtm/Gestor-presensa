import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType, FirebaseContextType } from '../types';
import { handleFirestoreError } from '../lib/firebaseUtils';
import { format } from 'date-fns';

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isTeacher: false,
  isAuthReady: false,
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
        // Skip logging for other errors, as this is simply a connection test.
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const userPath = `users/${currentUser.uid}`;
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, userPath);
          }
          
          const isMasterAdmin = currentUser.email?.toLowerCase() === "eduardofabian435@gmail.com";
          
          if (userDoc?.exists()) {
            const data = userDoc.data() as UserProfile;
            // Force admin role if it's the master email but role is wrong
            if (isMasterAdmin && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              try {
                await setDoc(doc(db, 'users', currentUser.uid), updatedProfile);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, userPath);
              }
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            // If profile doesn't exist, check if it's the default admin
            if (isMasterAdmin) {
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                name: currentUser.displayName || 'Administrador Master',
                email: currentUser.email || '',
                role: 'admin',
              };
              try {
                await setDoc(doc(db, 'users', currentUser.uid), newProfile);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, userPath);
              }
              setProfile(newProfile);
            } else {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        setProfile(null);
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || user?.email?.toLowerCase() === "eduardofabian435@gmail.com",
    isTeacher: profile?.role === 'teacher',
    isAuthReady,
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};
