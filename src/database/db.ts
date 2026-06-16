import Dexie, { type Table } from 'dexie';

export interface QRRecord {
  id?: number;
  qrCode: string;
  isValid: boolean;
  timestamp: Date;
  data?: Record<string, unknown>;
  synced: boolean;
  serverRecordId?: string;
}

export interface SyncStatus {
  id: number;
  lastSync: Date;
  pendingUploads: number;
}

export class QRDatabase extends Dexie {
  qrRecords!: Table<QRRecord>;
  syncStatus!: Table<SyncStatus>;

  constructor() {
    super('QRVerifierDB');

    this.version(1).stores({
      qrRecords: '++id, qrCode, isValid, timestamp, synced, serverRecordId',
      syncStatus: 'id, lastSync, pendingUploads'
    });

    this.qrRecords.hook('creating', function (_, obj) {
      obj.timestamp = new Date();
      obj.synced = false;
    });
  }

  async addQRRecord(qrCode: string, isValid: boolean, data?: Record<string, unknown>): Promise<number> {
    return await this.qrRecords.add({
      qrCode,
      isValid,
      data,
      timestamp: new Date(),
      synced: false
    });
  }

  async getUnsyncedRecords(): Promise<QRRecord[]> {
    return await this.qrRecords.where('synced').equals(0).toArray();
  }

  async markAsSynced(id: number, serverRecordId: string): Promise<void> {
    await this.qrRecords.update(id, { synced: true, serverRecordId });
  }

  async getAllRecords(): Promise<QRRecord[]> {
    return await this.qrRecords.orderBy('timestamp').reverse().toArray();
  }

  async getRecordByQRCode(qrCode: string): Promise<QRRecord | undefined> {
    return await this.qrRecords.where('qrCode').equals(qrCode).first();
  }

  async updateSyncStatus(lastSync: Date, pendingUploads: number): Promise<void> {
    await this.syncStatus.put({ id: 1, lastSync, pendingUploads });
  }

  async getSyncStatus(): Promise<SyncStatus | undefined> {
    return await this.syncStatus.get(1);
  }
}

export const db = new QRDatabase();
