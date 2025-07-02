import { db, type QRRecord } from '../database/db';

export interface SyncConfig {
  serverUrl: string;
  apiKey?: string;
  syncInterval: number; // минуты
}

export class SyncService {
  private config: SyncConfig;
  private syncIntervalId?: number;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  async startAutoSync(): Promise<void> {
    // Запускаем первоначальную синхронизацию
    await this.sync();

    // Устанавливаем интервал автосинхронизации
    this.syncIntervalId = window.setInterval(async () => {
      await this.sync();
    }, this.config.syncInterval * 60 * 1000);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  async sync(): Promise<void> {
    try {
      // Проверяем доступность интернета
      if (!navigator.onLine) {
        console.log('Offline: syncing skipped');
        return;
      }

      await this.uploadUnsyncedRecords();
      await this.downloadNewRecords();

      await db.updateSyncStatus(new Date(), 0);
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private async uploadUnsyncedRecords(): Promise<void> {
    const unsyncedRecords = await db.getUnsyncedRecords();

    for (const record of unsyncedRecords) {
      try {
        const response = await fetch(`${this.config.serverUrl}/api/qr-records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify({
            qrCode: record.qrCode,
            isValid: record.isValid,
            timestamp: record.timestamp,
            data: record.data
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (record.id) {
            await db.markAsSynced(record.id, result.id);
          }
        }
      } catch (error) {
        console.error('Failed to upload record:', error);
      }
    }
  }

  private async downloadNewRecords(): Promise<void> {
    try {
      const syncStatus = await db.getSyncStatus();
      const lastSync = syncStatus?.lastSync || new Date(0);

      const response = await fetch(`${this.config.serverUrl}/api/qr-records?since=${lastSync.toISOString()}`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      });

      if (response.ok) {
        const records: QRRecord[] = await response.json();

        for (const record of records) {
          // Проверяем, нет ли уже такой записи
          const existing = await db.getRecordByQRCode(record.qrCode);
          if (!existing) {
            await db.qrRecords.add({
              ...record,
              synced: true,
              serverRecordId: record.id?.toString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to download records:', error);
    }
  }

  async forcedSync(): Promise<void> {
    console.log('Starting forced sync...');
    await this.sync();
  }
}

// Глобальный экземпляр сервиса синхронизации
export const syncService = new SyncService({
  serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  apiKey: import.meta.env.VITE_API_KEY,
  syncInterval: 5 // синхронизация каждые 5 минут
});
