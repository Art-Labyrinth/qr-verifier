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
  private setLastSyncTimestamp(timestamp: string) {
    localStorage.setItem('last_sync_timestamp', timestamp);
    this.serverStatus.lastSync = timestamp;
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

  // Получение локальной базы билетов
  private getLocalTickets(): ServerTicket[] {
    const tickets = localStorage.getItem('local_tickets');
    return tickets ? JSON.parse(tickets) : [];
  }

  // Сохранение локальной базы билетов
  private setLocalTickets(tickets: ServerTicket[]) {
    localStorage.setItem('local_tickets', JSON.stringify(tickets));
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
        this.setLastSyncTimestamp(syncResponse.lastSyncTimestamp);

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
    const tickets = this.getLocalTickets();
    return tickets.find(ticket => ticket.ticket_id === ticketId) || null;
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
