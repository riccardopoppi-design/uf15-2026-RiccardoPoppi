export interface StaffUser {
  id?: number;
  username: string;
  role: 'MED' | 'INF' | 'AMM' | string; // Adeguare alle label reali del DB
  isActive: boolean;
}

export interface NewStaffPayload {
  username: string;
  password?: string;
  role: string;
}