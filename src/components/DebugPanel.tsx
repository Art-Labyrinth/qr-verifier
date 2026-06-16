import React, { useState, useEffect } from 'react';
import { syncService } from '../services/sync';

interface DebugPanelProps {
  onClearData: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ onClearData }) => {
  const [stats, setStats] = useState(syncService.getTicketStats());

  useEffect(() => {
    // Обновляем статистику сразу и затем каждые 5 секунд
    const update = () => setStats(syncService.getTicketStats());
    update();

    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString: string | null) =>
    isoString ? new Date(isoString).toLocaleString() : 'Никогда';

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  const prefixes = Object.entries(stats.byPrefix).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '5px',
      padding: '10px',
      marginBottom: '10px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        DEBUG — локальная база
      </div>

      {row('Сервер', stats.isOnline ? 'онлайн' : 'офлайн')}
      {row('Последняя синхронизация', formatTime(stats.lastSync))}
      {row('Билетов загружено', stats.total)}
      {row('Использовано', stats.used)}
      {row('Не использовано', stats.unused)}
      {row('Ожидают синхронизации', stats.pendingOperations)}

      <div style={{ marginTop: '8px', marginBottom: '4px', fontWeight: 'bold' }}>
        По префиксам:
      </div>
      {prefixes.length === 0 ? (
        <div style={{ color: '#6c757d' }}>нет данных</div>
      ) : (
        prefixes.map(([prefix, count]) => row(prefix, count))
      )}

      <button
        onClick={onClearData}
        style={{
          marginTop: '10px',
          padding: '4px 8px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        Очистить все данные
      </button>
    </div>
  );
};

export default DebugPanel;
