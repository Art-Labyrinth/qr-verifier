import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { ServerStatus, SyncOperation, ServerTicket } from '../types/auth';

class SyncService {
  private syncInterval: number | null = null;
  private serverStatus: ServerStatus = {
    isOnline: false,
    lastCheck: new Date().toISOString(),
    lastSync: null
  };

  constructor() {
    // Восстанавливаем время последней синхронизации при инициализации
    const savedLastSync = localStorage.getItem('last_sync_timestamp');
    if (savedLastSync) {
      this.serverStatus.lastSync = savedLastSync;
    }
  }

  // Генерация уникального ID устройства
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  // Получение времени последней синхронизации
  private getLastSyncTimestamp(): string {
    return localStorage.getItem('last_sync_timestamp') || new Date(0).toISOString();
  }

  // Сохранение времени последней синхронизации
  private setLastSyncTimestamp() {
    // Всегда используем текущее локальное время
    const localTimestamp = new Date().toISOString();

    localStorage.setItem('last_sync_timestamp', localTimestamp);
    this.serverStatus.lastSync = localTimestamp;

    // console.log(`Время синхронизации сохранено: ${localTimestamp}`);
  }

  // Получение операций ожидающих синхронизации
  private getPendingOperations(): SyncOperation[] {
    const pending = localStorage.getItem('pending_operations');
    return pending ? JSON.parse(pending) : [];
  }

  // Сохранение операций ожидающих синхронизации
  private setPendingOperations(operations: SyncOperation[]) {
    localStorage.setItem('pending_operations', JSON.stringify(operations));
  }

  // Получение локальной базы билетов с проверкой доступности
  private getLocalTickets(): ServerTicket[] {
    try {
      const tickets = localStorage.getItem('local_tickets');
      if (!tickets) {
        // console.log('Локальная база билетов пуста');
        return [];
      }

      const parsed = JSON.parse(tickets);
      // console.log(`Загружено ${parsed.length} билетов из локальной базы`);
      return parsed;
    } catch (error) {
      console.error('Ошибка чтения локальной базы билетов:', error);
      return [];
    }
  }

  // Сохранение локальной базы билетов с проверкой
  private setLocalTickets(tickets: ServerTicket[]) {
    try {
      const data = JSON.stringify(tickets);
      localStorage.setItem('local_tickets', data);

      // Проверяем, что данные действительно сохранились
      const saved = localStorage.getItem('local_tickets');
      if (!saved) {
        console.error('Не удалось сохранить билеты в localStorage');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Ошибка сохранения в локальную базу:', error);
      return false;
    }
  }

  // Обновление локальной базы билетов из updates
  private updateLocalTickets(updates: Record<string, unknown>[]) {
    if (!updates || updates.length === 0) return;

    const localTickets = this.getLocalTickets();
    const ticketMap = new Map<string, ServerTicket>();

    // Создаем карту существующих билетов
    localTickets.forEach(ticket => {
      if (ticket.code) {
        ticketMap.set(ticket.code, ticket);
      }
    });

    // Обновляем/добавляем новые билеты
    updates.forEach(update => {
      if (update.code) {
        ticketMap.set(update.code as string, {
          ...update,
          synced_at: new Date().toISOString()
        } as ServerTicket);
      }
    });

    // Сохраняем обновленную базу
    const updatedTickets = Array.from(ticketMap.values());
    this.setLocalTickets(updatedTickets);

    // console.log(`Обновлено ${updates.length} билетов в локальной базе`);
  }

  // Добавление операции в очередь синхронизации
  addOperation(operation: SyncOperation) {
    const pending = this.getPendingOperations();
    pending.push(operation);
    this.setPendingOperations(pending);

    // Проверяем авторизацию и статус сервера перед синхронизацией
    const isAuthenticated = !!localStorage.getItem('auth_token');
    if (isAuthenticated && this.serverStatus.isOnline) {
      this.performSync();
    } else if (!isAuthenticated) {
      // console.log('Операция добавлена в очередь, но синхронизация отложена: пользователь не авторизован');
    }
  }

  // Проверка статуса сервера
  async checkServerStatus(): Promise<boolean> {
    try {
      const isOnline = await apiService.checkServerStatus();
      this.serverStatus.isOnline = isOnline;
      this.serverStatus.lastCheck = new Date().toISOString();

      // console.log(`Сервер ${isOnline ? 'доступен' : 'недоступен'}`);
      return isOnline;
    } catch (error) {
      console.error('Ошибка проверки статуса сервера:', error);
      this.serverStatus.isOnline = false;
      this.serverStatus.lastCheck = new Date().toISOString();
      return false;
    }
  }

  // Выполнение синхронизации
  async performSync(): Promise<boolean> {
    try {
      // Проверяем авторизацию - синхронизация только для авторизованных пользователей
      const isAuthenticated = !!localStorage.getItem('auth_token');
      if (!isAuthenticated) {
        // console.log('Синхронизация пропущена: пользователь не авторизован');
        return false;
      }

      const isOnline = await this.checkServerStatus();
      if (!isOnline) {
        return false;
      }

      const pendingOperations = this.getPendingOperations();
      const lastSyncTimestamp = this.getLastSyncTimestamp();

      const syncRequest = {
        deviceId: this.getDeviceId(),
        lastSyncTimestamp,
        operations: pendingOperations
      };

      const syncResponse = await apiService.sync(syncRequest);

      if (syncResponse.success) {
        // Обрабатываем обновления билетов с сервера
        if (syncResponse.updates && syncResponse.updates.length > 0) {
          this.updateLocalTickets(syncResponse.updates);
        }

        // Очищаем успешно синхронизированные операции
        this.setPendingOperations([]);

        // Обновляем время последней синхронизации
        this.setLastSyncTimestamp();

        // console.log('Синхронизация завершена успешно');
        return true;
      } else {
        console.warn('Синхронизация завершена с ошибками:', syncResponse);
        return false;
      }
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      return false;
    }
  }

  // Запуск автоматической синхронизации
  startAutoSync() {
    // Останавливаем предыдущий интервал если есть
    this.stopAutoSync();

    // Выполняем первую синхронизацию сразу
    this.performSync();

    // Настраиваем регулярную синхронизацию
    this.syncInterval = window.setInterval(() => {
      this.performSync();
    }, API_CONFIG.syncInterval);

    // console.log('Автоматическая синхронизация запущена');
  }

  // Остановка автоматической синхронизации
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      // console.log('Автоматическая синхронизация остановлена');
    }
  }

  // Получение статуса сервера
  getServerStatus(): ServerStatus {
    return { ...this.serverStatus };
  }

  // Получение количества ожидающих операций
  getPendingOperationsCount(): number {
    return this.getPendingOperations().length;
  }

  // Получение билета из локальной базы
  getLocalTicket(ticketId: string): ServerTicket | null {
    const tickets = this.getLocalTickets();
    const ticket = tickets.find(ticket => ticket.code === ticketId) || null;
    return ticket;
  }

  // Получение всех локальных билетов
  getAllLocalTickets(): ServerTicket[] {
    return this.getLocalTickets();
  }

  // Получение количества билетов в локальной базе
  getLocalTicketsCount(): number {
    return this.getLocalTickets().length;
  }

  // Отметка билета как использованный (только для авторизованных пользователей)
  markTicketAsUsed(ticketCode: string, comment?: string): boolean {
    const isAuthenticated = !!localStorage.getItem('auth_token');
    if (!isAuthenticated) {
      console.log('Отметка билета отклонена: пользователь не авторизован');
      return false;
    }

    const tickets = this.getLocalTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.code === ticketCode);

    if (ticketIndex === -1) {
      console.log(`Билет не найден для отметки: ${ticketCode}`);
      return false;
    }

    // Обновляем билет
    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      used: new Date().toISOString(),
      status: false, // false означает использованный
      comment: comment || tickets[ticketIndex].comment
    };

    // Сохраняем обновленный список
    const success = this.setLocalTickets(tickets);

    if (success) {
      // Добавляем операцию в очередь синхронизации
      this.addOperation({
        id: `mark_used_${Date.now()}`,
        operation: 'update',
        ticketCode: ticketCode,
        scannedAt: new Date().toISOString(),
        metadata: {
          deviceId: localStorage.getItem('device_id') || 'unknown',
          userAgent: navigator.userAgent,
          action: 'mark_as_used',
          comment: comment
        }
      });

      return true;
    }

    return false;
  }

  // Обновление комментария к билету
  updateTicketComment(ticketCode: string, comment: string): boolean {
    const isAuthenticated = !!localStorage.getItem('auth_token');
    if (!isAuthenticated) {
      console.log('Обновление комментария отклонено: пользователь не авторизован');
      return false;
    }

    const tickets = this.getLocalTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.code === ticketCode);

    if (ticketIndex === -1) {
      console.log(`Билет не найден для обновления: ${ticketCode}`);
      return false;
    }

    // Обновляем комментарий
    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      comment: comment
    };

    // Сохраняем обновленный список
    const success = this.setLocalTickets(tickets);

    if (success) {
      // Добавляем операцию в очередь синхронизации
      this.addOperation({
        id: `update_comment_${Date.now()}`,
        operation: 'update',
        ticketCode: ticketCode,
        scannedAt: new Date().toISOString(),
        metadata: {
          deviceId: localStorage.getItem('device_id') || 'unknown',
          userAgent: navigator.userAgent,
          action: 'update_comment',
          comment: comment
        }
      });

      console.log(`Комментарий к билету обновлен: ${ticketCode}`);
      return true;
    }

    return false;
  }

  // Полное обновление билета (только для авторизованных пользователей)
  updateTicket(ticketCode: string, updates: Partial<ServerTicket>): boolean {
    const isAuthenticated = !!localStorage.getItem('auth_token');
    if (!isAuthenticated) {
      console.log('Обновление билета отклонено: пользователь не авторизован');
      return false;
    }

    const tickets = this.getLocalTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.code === ticketCode);

    if (ticketIndex === -1) {
      console.log(`Билет не найден для обновления: ${ticketCode}`);
      return false;
    }

    // Обновляем билет с новыми данными
    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      ...updates,
      code: ticketCode // Код не должен изменяться
    };

    // Сохраняем обновленный список
    const success = this.setLocalTickets(tickets);

    if (success) {
      // Добавляем операцию в очередь синхронизации
      this.addOperation({
        id: `update_ticket_${Date.now()}`,
        operation: 'update',
        ticketCode: ticketCode,
        scannedAt: new Date().toISOString(),
        metadata: {
          deviceId: localStorage.getItem('device_id') || 'unknown',
          userAgent: navigator.userAgent,
          action: 'update_ticket',
          updates: JSON.stringify(updates)
        }
      });

      console.log(`Билет обновлен: ${ticketCode}`, updates);
      return true;
    }

    return false;
  }

  // Отмена регистрации билета как использованного (только для авторизованных пользователей)
  unmarkTicketAsUsed(ticketCode: string): boolean {
    const isAuthenticated = !!localStorage.getItem('auth_token');
    if (!isAuthenticated) {
      console.log('Отмена регистрации билета отклонена: пользователь не авторизован');
      return false;
    }

    const tickets = this.getLocalTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.code === ticketCode);

    if (ticketIndex === -1) {
      console.log(`Билет не найден для отмены регистрации: ${ticketCode}`);
      return false;
    }

    // Обновляем билет
    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      used: null,
      status: true // Возвращаем валидный статус
    };

    // Сохраняем обновленный список
    const success = this.setLocalTickets(tickets);

    if (success) {
      // Добавляем операцию в очередь синхронизации
      this.addOperation({
        id: `unmark_used_${Date.now()}`,
        operation: 'update',
        ticketCode: ticketCode,
        scannedAt: new Date().toISOString(),
        metadata: {
          deviceId: localStorage.getItem('device_id') || 'unknown',
          userAgent: navigator.userAgent,
          action: 'unmark_as_used'
        }
      });

      console.log(`Отмена регистрации билета: ${ticketCode}`);
      return true;
    }

    return false;
  }

  // === МЕТОДЫ ДЛЯ ОТЛАДКИ ===

  // Проверка доступности localStorage
  debugCheckLocalStorage(): boolean {
    try {
      const testKey = 'test_localStorage';
      const testValue = 'test_value';

      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const isWorking = retrieved === testValue;
      console.log(`localStorage ${isWorking ? 'работает' : 'не работает'}`);
      return isWorking;
    } catch (error) {
      console.error('localStorage недоступен:', error);
      return false;
    }
  }

  // Получение статистики хранилища
  debugGetStorageStats(): {
    pendingOperations: number;
    localTickets: number;
    hasDeviceId: boolean;
    hasLastSync: boolean;
    storageSize: number;
  } {
    const stats = {
      pendingOperations: this.getPendingOperationsCount(),
      localTickets: this.getLocalTicketsCount(),
      hasDeviceId: !!localStorage.getItem('device_id'),
      hasLastSync: !!localStorage.getItem('last_sync_timestamp'),
      storageSize: 0
    };

    // Подсчитываем размер данных в localStorage
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      stats.storageSize = totalSize;
    } catch (error) {
      console.error('Ошибка подсчета размера хранилища:', error);
    }

    console.log('Статистика хранилища:', stats);
    return stats;
  }

  // Принудительное сохранение тестовых данных
  debugTestLocalStorage(): boolean {
    const testTickets: ServerTicket[] = [
      {
        id: 999,
        code: 'TEST-001',
        holder: 'Тестовый билет',
        email: 'test@example.com',
        status: true,
        is_sold: true,
        active: true,
        used: null,
        comment: 'Тестовый билет для проверки',
        created_at: new Date().toISOString(),
        synced_at: new Date().toISOString()
      }
    ];

    const success = this.setLocalTickets(testTickets);
    if (success) {
      const retrieved = this.getLocalTicket('TEST-001');
      const working = !!retrieved;
      console.log(`Тест localStorage: ${working ? 'успешно' : 'провалился'}`);
      return working;
    }

    return false;
  }

  // Очистка всех данных синхронизации
  clearAllSyncData() {
    localStorage.removeItem('pending_operations');
    localStorage.removeItem('last_sync_timestamp');
    localStorage.removeItem('device_id');
    localStorage.removeItem('local_tickets');
    this.serverStatus.lastSync = null;
    console.log('Все данные синхронизации очищены');
  }

  // Получение всех операций для отладки
  debugGetAllOperations(): SyncOperation[] {
    return this.getPendingOperations();
  }

  // Получение всех локальных билетов для отладки
  debugGetAllTickets(): ServerTicket[] {
    return this.getLocalTickets();
  }

  // Принудительная установка статуса сервера (для тестирования)
  debugSetServerStatus(isOnline: boolean) {
    this.serverStatus.isOnline = isOnline;
    this.serverStatus.lastCheck = new Date().toISOString();
    console.log(`Статус сервера принудительно установлен: ${isOnline ? 'онлайн' : 'офлайн'}`);
  }

  // Имитация получения updates с сервера (для тестирования)
  debugAddTestTickets(tickets: Record<string, unknown>[]) {
    this.updateLocalTickets(tickets);
    console.log(`Добавлено ${tickets.length} тестовых билетов`);
  }
}

export const syncService = new SyncService();
export default syncService;
