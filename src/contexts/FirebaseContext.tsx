import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { format } from 'date-fns';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function safeFormatDate(dateStr: string | undefined, formatStr: string, options?: any) {
  if (!dateStr) return 'Data não disponível';
  try {
    // Try to handle both YYYY-MM-DD and other formats
    const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return 'Data inválida';
    return format(date, formatStr, options);
  } catch (e) {
    return 'Erro na data';
  }
}

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isAuthReady: boolean;
}

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
