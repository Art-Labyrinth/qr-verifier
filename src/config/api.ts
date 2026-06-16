// Конфигурация API
export const API_CONFIG = {
  // Определяем базовый URL в зависимости от окружения
  baseURL: import.meta.env.DEV
    ? 'http://localhost:8000'
    : '/api/v1',

  // Таймауты
  timeout: 10000,
  syncInterval: 30000, // 30 секунд

  // Эндпоинты
  endpoints: {
    auth: '/users/auth',
    sync: '/qr/batch',
    changes: '/qr/changes',
    ticket: '/qr/tickets',
    createTicket: '/qr/tickets'
  }
};

export default API_CONFIG;
