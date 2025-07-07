import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isActive: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, isActive }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [result, setResult] = useState<string>('');

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
          setResult(decodedText);
          onScanSuccess(decodedText);
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
  }, [isActive, onScanSuccess]);

  return (
    <div>
      <div id="qr-reader" style={{ width: '100%' }}></div>
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#e8f5e8',
          borderRadius: '5px'
        }}>
          <strong>Результат:</strong> {result}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
