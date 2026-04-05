export type UserRole = 'admin' | 'teacher';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Student {
  id: string;
  name: string;
  registrationNumber: string;
  classId: string;
  polo: 'salvador' | 'ilha';
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
  polo: 'salvador' | 'ilha';
  points: { lat: number; lng: number }[];
  color?: string;
  createdAt: any;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  polo: 'salvador' | 'ilha';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  polo: 'salvador' | 'ilha';
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  teacherId: string;
  timestamp: any;
}

export interface Interruption {
  id: string;
  classId: string;
  teacherId: string;
  polo: 'salvador' | 'ilha';
  date: string;
  description: string;
  timestamp: any;
}

export interface ClassReport {
  id: string;
  classId: string;
  teacherId: string;
  polo: 'salvador' | 'ilha';
  date: string;
  content: string;
  timestamp: any;
}
