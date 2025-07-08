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

    console.log(`Время синхронизации сохранено: ${localTimestamp}`);
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
        console.log('Локальная база билетов пуста');
        return [];
      }

      const parsed = JSON.parse(tickets);
      console.log(`Загружено ${parsed.length} билетов из локальной базы`);
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

      console.log(`Сохранено ${tickets.length} билетов в локальную базу`);
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
      if (ticket.ticket_id) {
        ticketMap.set(ticket.ticket_id, ticket);
      }
    });

    // Обновляем/добавляем новые билеты
    updates.forEach(update => {
      if (update.ticket_id) {
        ticketMap.set(update.ticket_id as string, {
          ...update,
          synced_at: new Date().toISOString()
        } as ServerTicket);
      }
    });

    // Сохраняем обновленную базу
    const updatedTickets = Array.from(ticketMap.values());
    this.setLocalTickets(updatedTickets);

    console.log(`Обновлено ${updates.length} билетов в локальной базе`);
  }

  // Добавление операции в очередь синхронизации
  addOperation(operation: SyncOperation) {
    const pending = this.getPendingOperations();
    pending.push(operation);
    this.setPendingOperations(pending);

    // Если онлайн, пытаемся синхронизировать немедленно
    if (this.serverStatus.isOnline) {
      this.performSync();
    }
  }

  // Проверка статуса сервера
  async checkServerStatus(): Promise<boolean> {
    try {
      const isOnline = await apiService.checkServerStatus();
      this.serverStatus.isOnline = isOnline;
      this.serverStatus.lastCheck = new Date().toISOString();

      console.log(`Сервер ${isOnline ? 'доступен' : 'недоступен'}`);
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

        console.log('Синхронизация завершена успешно');
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

    console.log('Автоматическая синхронизация запущена');
  }

  // Остановка автоматической синхронизации
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Автоматическая синхронизация остановлена');
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
    console.log(`Поиск билета в локальной базе: ${ticketId}`);

    const tickets = this.getLocalTickets();
    console.log(`Доступно билетов в локальной базе: ${tickets.length}`);

    const ticket = tickets.find(ticket => ticket.ticket_id === ticketId) || null;

    if (ticket) {
      console.log(`Билет найден в локальной базе: ${ticketId}`);
    } else {
      console.log(`Билет НЕ найден в локальной базе: ${ticketId}`);
      // Выводим все доступные ticket_id для отладки
      const availableIds = tickets.map(t => t.ticket_id).slice(0, 5);
      console.log(`Первые 5 доступных ID: [${availableIds.join(', ')}]`);
    }

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
        ticket_id: 'TEST-001',
        name: 'Тестовый билет',
        email: 'test@example.com',
        phone: null,
        is_sold: true,
        active: true,
        used: null,
        comment: 'Тестовый билет для проверки',
        created_at: new Date().toISOString(),
        updated_at: null,
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
