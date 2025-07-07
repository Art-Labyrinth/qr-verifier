import { API_CONFIG } from '../config/api';
import type { LoginCredentials, LoginResponse, SyncRequest, SyncResponse, TicketInfo } from '../types/auth';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    // Загружаем токен из localStorage при инициализации
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Проверка доступности сервера
  async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 секунд таймаут
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Авторизация
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Создаем URLSearchParams для отправки данных в формате application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await this.request<LoginResponse>(
      API_CONFIG.endpoints.auth,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    this.setToken(response.access_token);
    return response;
  }

  // Логаут
  logout() {
    this.setToken(null);
  }

  // Синхронизация
  async sync(syncRequest: SyncRequest): Promise<SyncResponse> {
    return this.request<SyncResponse>(
      API_CONFIG.endpoints.sync,
      {
        method: 'POST',
        body: JSON.stringify(syncRequest),
      }
    );
  }

  // Получение изменений с сервера
  async getChanges(since: string): Promise<SyncResponse> {
    return this.request<SyncResponse>(
      `${API_CONFIG.endpoints.changes}?since=${encodeURIComponent(since)}`
    );
  }

  // Получение информации о билете
  async getTicketInfo(ticketCode: string): Promise<TicketInfo> {
    return this.request<TicketInfo>(
      `${API_CONFIG.endpoints.ticket}/${ticketCode}`
    );
  }
}

export const apiService = new ApiService();
export default apiService;
