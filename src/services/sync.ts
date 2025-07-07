import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { ServerStatus, SyncOperation } from '../types/auth';

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
}

export const syncService = new SyncService();
export default syncService;
