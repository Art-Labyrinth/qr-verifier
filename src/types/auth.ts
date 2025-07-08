// Типы для авторизации
export interface User {
  id: string;
  username: string;
  role_id?: number;
  role?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  exp: number | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}


export interface LoginResponse {
    access_token: string;
    token_type: string;
    user_id: string;
    username: string;
    role_id: number;
    role: string;
    redirect_url: string;
    exp: number;
}

// Типы для синхронизации
export interface SyncOperation {
  id: string;
  operation: 'scan' | 'update' | 'delete';
  ticketCode: string;
  scannedAt: string;
  metadata?: {
    deviceId: string;
    userAgent: string;
  };
}

export interface SyncRequest {
  deviceId: string;
  lastSyncTimestamp: string;
  operations: SyncOperation[];
}

export interface SyncResponse {
  success: boolean;
  conflicts: Record<string, unknown>[];
  updates: Record<string, unknown>[];
  lastSyncTimestamp: string;
}

export interface ServerStatus {
  isOnline: boolean;
  lastCheck: string;
  lastSync: string | null;
}

// {
//     "code": "M-301-5169",
//     "holder": "Станислав Кыса",
//     "email": "ky*******@gmail.com",
//     "status": true,
//     "active": true,
//     "is_sold": true,
//     "used": null,
//     "comment": "",
//     "created_at": "2025-07-02T13:37:43.680986+00:00"
// }
export interface TicketInfo {
  code: string;
  holder: string;
  email: string;
  status: 'valid' | 'invalid' | 'used';
  active: boolean;
  is_sold: boolean;
  used?: string | null;
  comment?: string;
  created_at: string;
}

// Тип для билета из обновлений сервера
export interface ServerTicket {
  id: number;
  ticket_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_sold: boolean;
  active: boolean;
  used?: string | null;
  comment: string;
  created_at: string;
  updated_at?: string | null;
  synced_at?: string; // Добавляется при сохранении в локальную базу
}