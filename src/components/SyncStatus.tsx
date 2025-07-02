import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { syncService } from '../services/syncService';
import { db, type SyncStatus } from '../database/db';

const SyncStatusComponent: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await db.getSyncStatus();
      setSyncStatus(status || null);

      const unsynced = await db.getUnsyncedRecords();
      setPendingCount(unsynced.length);
    };

    updateSyncStatus();

    // Обновляем статус каждые 30 секунд
    const interval = setInterval(updateSyncStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleForcedSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncService.forcedSync();

      // Обновляем статус после синхронизации
      const status = await db.getSyncStatus();
      setSyncStatus(status || null);

      const unsynced = await db.getUnsyncedRecords();
      setPendingCount(unsynced.length);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн. назад`;
  };

  return (
    <div className="sync-status">
      <div className="sync-status-header">
        <div className="connection-status">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={`connection-text ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Онлайн' : 'Офлайн'}
          </span>
        </div>

        <button
          onClick={handleForcedSync}
          disabled={!isOnline || isSyncing}
          className="sync-button"
          title="Принудительная синхронизация"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="sync-details">
        {pendingCount > 0 && (
          <div className="pending-sync">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="pending-text">
              {pendingCount} записей ожидают синхронизации
            </span>
          </div>
        )}

        {syncStatus && (
          <div className="last-sync">
            <span className="last-sync-text">
              Последняя синхронизация: {formatLastSync(syncStatus.lastSync)}
            </span>
          </div>
        )}

        {!syncStatus && (
          <div className="no-sync">
            <span className="no-sync-text">
              Синхронизация ещё не выполнялась
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatusComponent;
