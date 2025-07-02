import React from 'react';
import { CheckCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import type { QRRecord } from '../database/db';

interface QRRecordsListProps {
  records: QRRecord[];
  onRecordClick?: (record: QRRecord) => void;
}

const QRRecordsList: React.FC<QRRecordsListProps> = ({ records, onRecordClick }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getSyncIcon = (synced: boolean) => {
    return synced ? (
      <div title="Синхронизировано">
        <Wifi className="w-4 h-4 text-blue-500" />
      </div>
    ) : (
      <div title="Ожидает синхронизации">
        <WifiOff className="w-4 h-4 text-gray-500" />
      </div>
    );
  };

  if (records.length === 0) {
    return (
      <div className="records-empty">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-center">Записи не найдены</p>
        <p className="text-sm text-gray-500 text-center mt-2">
          Отсканируйте QR код, чтобы создать первую запись
        </p>
      </div>
    );
  }

  return (
    <div className="records-list">
      <h3 className="records-title">
        История сканирований ({records.length})
      </h3>

      <div className="records-container">
        {records.map((record) => (
          <div
            key={record.id}
            className={`record-item ${onRecordClick ? 'clickable' : ''}`}
            onClick={() => onRecordClick?.(record)}
          >
            <div className="record-header">
              <div className="record-status">
                {getStatusIcon(record.isValid)}
                <span className={`status-text ${record.isValid ? 'valid' : 'invalid'}`}>
                  {record.isValid ? 'Действительный' : 'Недействительный'}
                </span>
              </div>
              <div className="record-sync">
                {getSyncIcon(record.synced)}
              </div>
            </div>

            <div className="record-content">
              <div className="record-qr-code">
                <span className="qr-label">QR код:</span>
                <span className="qr-value">{record.qrCode}</span>
              </div>

              {record.data && Object.keys(record.data).length > 0 && (
                <div className="record-data">
                  <span className="data-label">Дополнительно:</span>
                  <pre className="data-value">
                    {JSON.stringify(record.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="record-footer">
              <time className="record-timestamp">
                {formatDate(record.timestamp)}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRRecordsList;
