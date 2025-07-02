import { useState, useEffect } from 'react';
import { Play, Pause, List, Scan } from 'lucide-react';
import QRScanner from './components/QRScanner';
import QRRecordsList from './components/QRRecordsList';
import SyncStatusComponent from './components/SyncStatus';
import { db, type QRRecord } from './database/db';
import { syncService } from './services/syncService';
import type { Html5QrcodeResult } from 'html5-qrcode';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [currentView, setCurrentView] = useState<'scanner' | 'records'>('scanner');
  const [records, setRecords] = useState<QRRecord[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  useEffect(() => {
    // Инициализация базы данных и синхронизации
    const initializeApp = async () => {
      try {
        await loadRecords();
        await syncService.startAutoSync();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    return () => {
      syncService.stopAutoSync();
    };
  }, []);

  const loadRecords = async () => {
    try {
      const allRecords = await db.getAllRecords();
      setRecords(allRecords);
    } catch (error) {
      console.error('Failed to load records:', error);
    }
  };

  const validateQRCode = (qrCode: string): boolean => {
    // Простая валидация - проверяем, что QR код не пустой
    // Здесь можно добавить более сложную логику валидации
    return qrCode.length > 0 && qrCode.trim().length > 0;
  };

  const handleScanSuccess = async (decodedText: string, decodedResult: Html5QrcodeResult) => {
    try {
      // Проверяем, не сканировали ли мы уже этот код недавно
      if (lastScannedCode === decodedText) {
        return;
      }

      setLastScannedCode(decodedText);

      // Сбрасываем lastScannedCode через 2 секунды
      setTimeout(() => setLastScannedCode(null), 2000);

      const isValid = validateQRCode(decodedText);

      // Сохраняем результат в базу данных
      await db.addQRRecord(decodedText, isValid, {
        format: decodedResult.result.format,
        timestamp: new Date().toISOString()
      });

      // Обновляем список записей
      await loadRecords();

      // Показываем уведомление пользователю
      if (isValid) {
        console.log('QR код успешно верифицирован:', decodedText);
      } else {
        console.log('QR код не прошёл валидацию:', decodedText);
      }
    } catch (error) {
      console.error('Failed to process QR code:', error);
    }
  };

  const handleScanError = (error: string) => {
    // Игнорируем обычные ошибки сканирования (например, когда QR код не в кадре)
    if (!error.includes('NotFoundException')) {
      console.warn('QR Scanner error:', error);
    }
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  const switchView = (view: 'scanner' | 'records') => {
    setCurrentView(view);
    if (view === 'records') {
      loadRecords(); // Обновляем записи при переключении на просмотр
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">QR Verifier</h1>
        <p className="app-subtitle">Верификация QR кодов с поддержкой офлайн режима</p>

        <SyncStatusComponent />

        <nav className="app-nav">
          <button
            onClick={() => switchView('scanner')}
            className={`nav-button ${currentView === 'scanner' ? 'active' : ''}`}
          >
            <Scan className="w-4 h-4" />
            Сканер
          </button>
          <button
            onClick={() => switchView('records')}
            className={`nav-button ${currentView === 'records' ? 'active' : ''}`}
          >
            <List className="w-4 h-4" />
            Записи ({records.length})
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'scanner' && (
          <div className="scanner-view">
            <div className="scanner-controls">
              <button
                onClick={toggleScanning}
                className={`scanner-toggle ${isScanning ? 'scanning' : ''}`}
              >
                {isScanning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Остановить сканирование
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Начать сканирование
                  </>
                )}
              </button>
            </div>

            <QRScanner
              isActive={isScanning}
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
            />

            {records.length > 0 && (
              <div className="recent-scans">
                <h3>Последние сканирования</h3>
                <div className="recent-scans-list">
                  {records.slice(0, 3).map((record) => (
                    <div key={record.id} className="recent-scan-item">
                      <span className={`scan-status ${record.isValid ? 'valid' : 'invalid'}`}>
                        {record.isValid ? '✓' : '✗'}
                      </span>
                      <span className="scan-code">{record.qrCode}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'records' && (
          <div className="records-view">
            <QRRecordsList records={records} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
