import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiService } from '../services/api';
import { syncService } from '../services/sync';
import type { TicketInfo, ServerTicket } from '../types/auth';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, ticketInfo?: TicketInfo) => void;
  onStopScanning: () => void;
  isActive: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onStopScanning, isActive }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [result, setResult] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');

  // Преобразование ServerTicket в TicketInfo
  const convertServerTicketToTicketInfo = useCallback((serverTicket: ServerTicket): TicketInfo => {
    return {
      code: serverTicket.ticket_id,
      holder: serverTicket.name || 'Не указан',
      email: serverTicket.email || 'Не указан',
      status: serverTicket.used ? 'used' : (serverTicket.active ? 'valid' : 'invalid'),
      active: serverTicket.active,
      is_sold: serverTicket.is_sold,
      used: serverTicket.used,
      comment: serverTicket.comment,
      created_at: serverTicket.created_at
    };
  }, []);

  // Функция для форматирования кода (L-NNN-NNNN)
  const formatTicketCode = (value: string) => {
    // Удаляем все кроме букв и цифр
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (cleaned.length === 0) return '';
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 4) return `${cleaned[0]}-${cleaned.slice(1)}`;
    return `${cleaned[0]}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 8)}`;
  };

  // Обработка ручного ввода кода
  const handleManualCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTicketCode(e.target.value);
    setManualCode(formatted);
  };

  // Отправка кода на обработку
  const submitTicketCode = useCallback(async (code: string) => {
    setResult(code);

    try {
      // Сначала ищем билет в локальной базе
      const localTicket = syncService.getLocalTicket(code);

      if (localTicket) {
        // Билет найден в локальной базе
        const ticketInfo = convertServerTicketToTicketInfo(localTicket);
        console.log('Билет найден в локальной базе:', code);
        onScanSuccess(code, ticketInfo);
      } else {
        // Билет не найден локально, обращаемся к серверу
        console.log('Билет не найден локально, запрашиваем с сервера:', code);
        try {
          const ticketInfo = await apiService.getTicketInfo(code);
          onScanSuccess(code, ticketInfo);
        } catch (serverError) {
          console.error('Ошибка получения информации о билете с сервера:', serverError);
          // Отправляем код без информации о билете
          onScanSuccess(code);
        }
      }
    } catch (error) {
      console.error('Ошибка при обработке билета:', error);
      onScanSuccess(code);
    }

    // Останавливаем сканирование после успешного сканирования
    if (isActive) {
      onStopScanning();
    }
  }, [onScanSuccess, onStopScanning, isActive, convertServerTicketToTicketInfo]);

  // Обработка ручной отправки кода
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.length === 10) { // L-NNN-NNNN = 9 символов
      submitTicketCode(manualCode);
      setManualCode('');
    }
  };

  useEffect(() => {
    if (isActive && !scannerRef.current) {
      // Запускаем сканер
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          // Автоматически отправляем отсканированный код
          submitTicketCode(decodedText);
        },
        () => {
          // Игнорируем ошибки сканирования
        }
      );
    }

    if (!isActive && scannerRef.current) {
      // Останавливаем сканер
      scannerRef.current.clear();
      scannerRef.current = null;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [isActive, onScanSuccess, submitTicketCode]);

  return (
    <div>
      {/* Поле для ручного ввода кода */}
      <form onSubmit={handleManualSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold'
          }}>
            Введите код билета:
          </label>
          <input
            type="text"
            value={manualCode}
            onChange={handleManualCodeChange}
            placeholder="A-123-4567"
            maxLength={10}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              textAlign: 'center',
              fontFamily: 'monospace',
              letterSpacing: '2px'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={manualCode.length !== 10}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            backgroundColor: manualCode.length === 10 ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: manualCode.length === 10 ? 'pointer' : 'not-allowed'
          }}
        >
          Проверить код
        </button>
      </form>

      {/* QR Сканер */}
      <div id="qr-reader" style={{ width: '100%' }}></div>

      {/* Результат */}
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <strong>Код билета:</strong> {result}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
