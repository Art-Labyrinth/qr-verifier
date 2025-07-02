import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, type Html5QrcodeResult } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

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

  const startScanner = useCallback(() => {
    if (scannerRef.current) {
      return;
    }

    const config = {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250,
      },
      aspectRatio: 1.0,
      disableFlip: false,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 1,
    };

    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false
    );

    scannerRef.current.render(
      (decodedText, decodedResult) => {
        onScanSuccess(decodedText, decodedResult);
      },
      (error) => {
        if (onScanError) {
          onScanError(error);
        }
      }
    );

    setIsScanning(true);
  }, [onScanSuccess, onScanError]);

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
    if (isActive && !isScanning) {
      startScanner();
    } else if (!isActive && isScanning) {
      stopScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isActive, isScanning, startScanner, stopScanner]);

  return (
    <div className="qr-scanner">
      <div className="scanner-header">
        <h3 className="scanner-title">
          {isScanning ? (
            <>
              <Camera className="w-5 h-5" />
              Сканирование активно
            </>
          ) : (
            <>
              <CameraOff className="w-5 h-5" />
              Сканер остановлен
            </>
          )}
        </h3>
      </div>

      <div
        id="qr-reader"
        className={`qr-reader ${!isActive ? 'hidden' : ''}`}
      />

      {!isActive && (
        <div className="scanner-placeholder">
          <CameraOff className="w-16 h-16 text-gray-400" />
          <p className="text-gray-600 mt-2">Сканер остановлен</p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
