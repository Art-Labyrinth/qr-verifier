import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react';
import { syncService } from '../services/sync';
import type { ServerStatus } from '../types/auth';

const SyncStatus: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus>(syncService.getServerStatus());
  const [pendingCount, setPendingCount] = useState(syncService.getPendingOperationsCount());

  useEffect(() => {
    // Обновляем статус сразу и затем каждые 5 секунд
    const update = () => {
      setStatus(syncService.getServerStatus());
      setPendingCount(syncService.getPendingOperationsCount());
    };
    update();

    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Никогда';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;

    return date.toLocaleDateString();
  };

  const handleManualSync = async () => {
    await syncService.performSync();
    setStatus(syncService.getServerStatus());
    setPendingCount(syncService.getPendingOperationsCount());
  };

  // Блок нужен только когда есть несинхронизированные билеты в очереди
  // (билет просканирован, но статус ещё не загружен на сервер).
  if (pendingCount === 0) return null;

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {status.isOnline ? (
            <Wifi size={16} style={{ color: '#28a745' }} />
          ) : (
            <WifiOff size={16} style={{ color: '#dc3545' }} />
          )}
          <span style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: status.isOnline ? '#28a745' : '#dc3545'
          }}>
            {status.isOnline ? 'Онлайн' : 'Офлайн'}
          </span>
        </div>

        <button
          onClick={handleManualSync}
          disabled={!status.isOnline}
          style={{
            background: 'none',
            border: 'none',
            cursor: status.isOnline ? 'pointer' : 'not-allowed',
            padding: '4px',
            opacity: status.isOnline ? 1 : 0.5
          }}
          title="Синхронизировать вручную"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#6c757d' }}>
        <div style={{ marginBottom: '4px' }}>
          <Clock size={12} style={{ marginRight: '4px' }} />
          Последняя синхронизация: {formatTime(status.lastSync)}
        </div>

        {pendingCount > 0 && (
          <div style={{ color: '#ffc107' }}>
            Ожидает синхронизации: {pendingCount} операций
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatus;
