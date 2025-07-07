import React, { useState, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle } from 'lucide-react';

const CameraDebugger: React.FC = () => {
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  const [permissions, setPermissions] = useState<string>('unknown');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    checkCameraSupport();
  }, []);

  const checkCameraSupport = async () => {
    // Проверка поддержки MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false);
      setPermissions('not_supported');
      return;
    }

    setCameraSupported(true);

    try {
      // Получение списка устройств
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Проверка разрешений
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setPermissions('granted');
        setTestStream(stream);
        // Останавливаем поток сразу
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        const error = err as Error & { name?: string };
        if (error.name === 'NotAllowedError') {
          setPermissions('denied');
        } else {
          setPermissions('error: ' + error.message);
        }
      }
    } catch (err) {
      console.error('Error checking camera:', err);
      setPermissions('error');
    }
  };

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setTestStream(stream);
      setPermissions('granted');

      // Останавливаем через 3 секунды
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setTestStream(null);
      }, 3000);
    } catch (err) {
      const error = err as Error & { name?: string };
      console.error('Camera test failed:', error);
      setPermissions('denied: ' + error.message);
    }
  };

  return (
    <div className="camera-debugger" style={{
      padding: '20px',
      margin: '20px 0',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Camera size={20} />
        Диагностика камеры
      </h3>

      <div style={{ margin: '10px 0' }}>
        <strong>Поддержка MediaDevices API:</strong> {' '}
        {cameraSupported === null ? (
          'Проверка...'
        ) : cameraSupported ? (
          <span style={{ color: 'green' }}>
            <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Поддерживается
          </span>
        ) : (
          <span style={{ color: 'red' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Не поддерживается
          </span>
        )}
      </div>

      <div style={{ margin: '10px 0' }}>
        <strong>Разрешения камеры:</strong> {' '}
        <span style={{
          color: permissions === 'granted' ? 'green' :
                permissions === 'denied' || permissions.includes('denied') ? 'red' :
                'orange'
        }}>
          {permissions}
        </span>
      </div>

      <div style={{ margin: '10px 0' }}>
        <strong>Найдено видеоустройств:</strong> {devices.length}
        {devices.length > 0 && (
          <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
            {devices.map((device, index) => (
              <li key={device.deviceId}>
                {device.label || `Камера ${index + 1}`} (ID: {device.deviceId.substring(0, 20)}...)
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ margin: '15px 0' }}>
        <button
          onClick={testCamera}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          disabled={!cameraSupported}
        >
          Тестировать камеру
        </button>
      </div>

      {testStream && (
        <div style={{ color: 'green', fontSize: '14px' }}>
          ✅ Камера работает! Поток активен на 3 секунды...
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <strong>User Agent:</strong><br />
        {navigator.userAgent}
      </div>
    </div>
  );
};

export default CameraDebugger;
