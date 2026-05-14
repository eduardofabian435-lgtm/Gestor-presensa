import { OperationType } from '../constants/operations';

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

export type UserRole = 'admin' | 'teacher';
export type Polo = 'salvador' | 'ilha';
export type AttendanceStatus = 'present' | 'absent';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface FirebaseContextType {
  user: any; // Use any to avoid Auth dependency if possible, or import User
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isAuthReady: boolean;
}
