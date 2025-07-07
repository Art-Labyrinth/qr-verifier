import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, type Html5QrcodeResult } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, Loader } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: Html5QrcodeResult) => void;
  onScanError?: (error: string) => void;
  isActive: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isActive
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Проверка разрешений камеры
  const checkCameraPermission = useCallback(async () => {
    try {
      // Проверяем поддержку MediaDevices API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      const error = err as Error & { name?: string };
      console.error('Camera permission denied:', error);
      setHasPermission(false);

      let errorMessage = 'Разрешите доступ к камере для сканирования QR кодов';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Доступ к камере запрещен. Разрешите использование камеры в настройках браузера.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Камера не найдена на устройстве.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Камера занята другим приложением.';
      } else if (error.name === 'NotSupportedError' || error.message?.includes('not supported')) {
        errorMessage = 'Камера не поддерживается в этом браузере.';
      }

      setError(errorMessage);
      return false;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (scannerRef.current || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Проверяем разрешения камеры
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      setIsLoading(false);
      return;
    }

    try {
      const config = {
        fps: 10,
        qrbox: {
          width: Math.min(300, window.innerWidth - 40),
          height: Math.min(300, window.innerWidth - 40),
        },
        aspectRatio: 1.0,
        disableFlip: false,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 1,
        rememberLastUsedCamera: true,
        useBarCodeDetectorIfSupported: true
      };

      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        config,
        false
      );

      scannerRef.current.render(
        (decodedText, decodedResult) => {
          setError(null);
          onScanSuccess(decodedText, decodedResult);
        },
        (error) => {
          // Игнорируем частые ошибки сканирования (это нормально)
          if (!error.includes('NotFoundException') && !error.includes('No QR code found')) {
            console.warn('QR Scanner error:', error);
            if (onScanError) {
              onScanError(error);
            }
          }
        }
      );

      setIsScanning(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      setError('Не удалось запустить сканер. Проверьте разрешения камеры.');
      setIsLoading(false);
      setIsScanning(false);
    }
  }, [onScanSuccess, onScanError, checkCameraPermission, isLoading]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear()
        .then(() => {
          scannerRef.current = null;
          setIsScanning(false);
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (isActive && !isScanning && !isLoading) {
      startScanner();
    } else if (!isActive && isScanning) {
      stopScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isActive, isScanning, isLoading, startScanner, stopScanner]);

  // Обработка изменений разрешений
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && hasPermission === false) {
        // Когда пользователь возвращается на страницу, повторно проверяем разрешения
        checkCameraPermission();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, hasPermission, checkCameraPermission]);

  return (
    <div className="qr-scanner">
      <div className="scanner-header">
        <h3 className="scanner-title">
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Запуск сканера...
            </>
          ) : isScanning ? (
            <>
              <Camera className="w-5 h-5" />
              Наведите камеру на QR код
            </>
          ) : (
            <>
              <CameraOff className="w-5 h-5" />
              Сканер остановлен
            </>
          )}
        </h3>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-600">{error}</span>
          {hasPermission === false && (
            <button
              onClick={checkCameraPermission}
              className="retry-button"
            >
              Повторить
            </button>
          )}
        </div>
      )}

      <div
        id="qr-reader"
        className={`qr-reader ${!isActive || error ? 'hidden' : ''}`}
      />

      {!isActive && !error && (
        <div className="scanner-placeholder">
          <CameraOff className="w-16 h-16 text-gray-400" />
          <p className="text-gray-600 mt-2">Нажмите "Начать сканирование" для запуска</p>
        </div>
      )}

      {error && hasPermission === false && (
        <div className="scanner-placeholder">
          <AlertCircle className="w-16 h-16 text-red-400" />
          <div className="text-center mt-4">
            <p className="text-red-600 font-medium">Нет доступа к камере</p>
            <p className="text-gray-600 text-sm mt-2">
              Разрешите доступ к камере в настройках браузера
            </p>
            <ol className="text-sm text-gray-600 mt-2 text-left max-w-md">
              <li>1. Нажмите на иконку замка в адресной строке</li>
              <li>2. Выберите "Разрешить" для камеры</li>
              <li>3. Обновите страницу</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
