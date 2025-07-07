import { useState, useEffect } from 'react';
import { Play, Pause, LogIn, LogOut } from 'lucide-react';
import QRScanner from './components/QRScanner';
import LoginModal from './components/LoginModal';
import SyncStatus from './components/SyncStatus';
import { syncService } from './services/sync';
import { apiService } from './services/api';
import type { User, TicketInfo } from './types/auth';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Запускаем автоматическую синхронизацию при загрузке
    syncService.startAutoSync();

    // Проверяем сохраненную авторизацию
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user_data');

    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Ошибка восстановления пользователя:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }

    return () => {
      syncService.stopAutoSync();
    };
  }, []);

  const handleScanSuccess = (decodedText: string, ticketData?: TicketInfo) => {
    setTicketInfo(ticketData || null);
    console.log('QR код отсканирован:', decodedText);

    // Добавляем операцию в очередь синхронизации
    syncService.addOperation({
      id: `scan_${Date.now()}`,
      operation: 'scan',
      ticketCode: decodedText,
      scannedAt: new Date().toISOString(),
      metadata: {
        deviceId: localStorage.getItem('device_id') || 'unknown',
        userAgent: navigator.userAgent
      }
    });
  };

  const handleStopScanning = () => {
    setIsScanning(false);
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    localStorage.removeItem('user_data');
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center' }}>QR Сканер</h1>

      {/* Статус синхронизации */}
      <SyncStatus />

      {/* Панель авторизации */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        border: '1px solid #dee2e6'
      }}>
        {user ? (
          <>
            <span style={{ fontSize: '14px' }}>
              Привет, <strong>{user.username}</strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={16} />
              Выйти
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              Не авторизован
            </span>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogIn size={16} />
              Войти
            </button>
          </>
        )}
      </div>

      {/* Кнопка сканирования */}
      <button
        onClick={toggleScanning}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '16px',
          backgroundColor: isScanning ? '#dc3545' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isScanning ? (
          <>
            <Pause size={20} />
            Остановить сканирование
          </>
        ) : (
          <>
            <Play size={20} />
            Начать сканирование
          </>
        )}
      </button>

      <QRScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onStopScanning={handleStopScanning}
      />

      {ticketInfo && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          // backgroundColor: '#d4edda',
          backgroundColor: ticketInfo.status ? '#d4edda' : '#f8d7da',
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Информация о билете:</h3>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <p><strong>Код:</strong> {ticketInfo.code}</p>
            <p><strong>Владелец:</strong> {ticketInfo.holder}</p>
            <p><strong>Email:</strong> {ticketInfo.email}</p>
            <p>{`${ticketInfo.active ? "Активен" : "Не активен"}`} {ticketInfo.is_sold ? "Оплачен" : "Не оплачен"}</p>
            {ticketInfo.used && <p><strong>Использован:</strong> {new Date(ticketInfo.used).toLocaleString()}</p>}
            <p><strong>Комментарий:</strong> {ticketInfo.comment}</p>
            {/* comment */}
            <p><strong>Создан:</strong> {new Date(ticketInfo.created_at).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Модальное окно авторизации */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
