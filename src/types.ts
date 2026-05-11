import { User } from 'firebase/auth';

export type UserRole = 'admin' | 'teacher';
export type Polo = 'salvador' | 'ilha';
export type AttendanceStatus = 'present' | 'absent';

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

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isAuthReady: boolean;
}

export interface Student {
  id: string;
  name: string;
  registrationNumber: string;
  classId: string;
  polo: Polo;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: any;
  location?: {
    lat: number;
    lng: number;
  };
  vulnerabilityAreaId?: string;
  isVulnerabilityArea?: boolean;
  isRiskArea?: boolean;
  paysWater?: boolean;
  paysElectricity?: boolean;
  hasWaterGato?: boolean;
  hasElectricityGato?: boolean;
}

export interface VulnerabilityArea {
  id: string;
  name: string;
  description: string;
  type: 'slum' | 'low-income' | 'remote' | 'other';
  polo: Polo;
  points: { lat: number; lng: number }[];
  color?: string;
  createdAt: any;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherIds: string[];
  polo: Polo;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  polo: Polo;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  teacherId: string;
  timestamp: any;
}

export interface Interruption {
  id: string;
  classId: string;
  teacherId: string;
  polo: Polo;
  date: string;
  description: string;
  timestamp: any;
}

export interface ClassReport {
  id: string;
  classId: string;
  teacherId: string;
  polo: Polo;
  date: string;
  content: string;
  timestamp: any;
}

export interface ScheduleItem {
  time: string;
  activity: string;
  details?: string;
}

export interface DaySchedule {
  [day: string]: ScheduleItem[];
}

export interface GroupSchedule {
  id: string;
  name: string;
  ageRange?: string;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  days: DaySchedule;
  createdAt?: any;
}
