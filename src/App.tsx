import { useState, useEffect } from 'react';
import { Play, Pause, LogIn, LogOut } from 'lucide-react';
import QRScanner from './components/QRScanner';
import LoginModal from './components/LoginModal';
import SyncStatus from './components/SyncStatus';
import TicketEditor from './components/TicketEditor';
import { syncService } from './services/sync';
import { apiService } from './services/api';
import type { User, TicketInfo } from './types/auth';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [autoRegistrationMessage, setAutoRegistrationMessage] = useState<string | null>(null);

  // Проверяем наличие debug параметра в URL
  const isDebugMode = new URLSearchParams(window.location.search).has('debug');

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

    // Подписываемся на изменения авторизации
    const handleAuthChange = (isAuthenticated: boolean) => {
      if (!isAuthenticated) {
        // Если пользователь больше не авторизован, очищаем его данные
        setUser(null);
        localStorage.removeItem('user_data');
        console.log('Пользователь деавторизован, данные очищены');
      }
    };

    apiService.onAuthChange(handleAuthChange);

    return () => {
      syncService.stopAutoSync();
      apiService.removeAuthChangeListener(handleAuthChange);
    };
  }, []);

  const handleScanSuccess = (decodedText: string, ticketData?: TicketInfo) => {
    let finalTicketData = ticketData;
    let message: string | null = null;

    // Если пользователь авторизован и билет найден, проверяем возможность автоматической регистрации
    if (user && ticketData) {
      const canAutoRegister =
        ticketData.active &&
        ticketData.is_sold &&
        !ticketData.used;

      if (canAutoRegister) {
        // Автоматически отмечаем билет как использованный
        const success = syncService.markTicketAsUsed(decodedText, '');
        if (success) {
          finalTicketData = {
            ...ticketData,
            status: false,
            used: new Date().toISOString()
          };
          message = 'Билет успешно зарегистрирован!';
        }
      } else {
        // Формируем сообщение о причинах невозможности автоматической регистрации
        const reasons = [];
        if (!ticketData.active) reasons.push('билет не активен');
        if (!ticketData.is_sold) reasons.push('билет не оплачен');
        if (ticketData.used) reasons.push('билет уже использован');

        if (reasons.length > 0) {
          message = 'Билет недействительный';
        }
      }
    }

    setTicketInfo(finalTicketData || null);
    setAutoRegistrationMessage(message);
    console.log('QR код отсканирован:', decodedText);

    // Очищаем сообщение через 5 секунд
    // if (message) {
    //   setTimeout(() => setAutoRegistrationMessage(null), 5000);
    // }

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

  const handleClearAllData = () => {
    if (confirm('Вы уверены, что хотите очистить все локальные данные?')) {
      syncService.clearAllSyncData();
      apiService.logout();
      setUser(null);
      setTicketInfo(null);
      localStorage.clear();
      alert('Все данные очищены');
    }
  };

  const handleTicketUpdate = (updatedTicket: TicketInfo) => {
    setTicketInfo(updatedTicket);
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
      {!isScanning && <SyncStatus />}

      {/* Панель авторизации */}
      {!isScanning && (
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
      )}

      {/* Отладочная информация (только с параметром ?debug) */}
      {!isScanning && isDebugMode && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '5px',
          padding: '10px',
          marginBottom: '10px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>DEBUG:</strong> Билетов в локальной БД: {syncService.getLocalTicketsCount()}
          </div>
          <button
            onClick={handleClearAllData}
            style={{
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
      )}

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

      {/* Сообщение об автоматической регистрации */}
      {autoRegistrationMessage && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: autoRegistrationMessage.includes('успешно') ? '#d4edda' : '#fff3cd',
          border: `1px solid ${autoRegistrationMessage.includes('успешно') ? '#c3e6cb' : '#ffeaa7'}`,
          borderRadius: '5px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {autoRegistrationMessage}
        </div>
      )}

      <QRScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onStopScanning={handleStopScanning}
      />

      {ticketInfo && (
        <TicketEditor
          ticketInfo={ticketInfo}
          isAuthenticated={!!user}
          onUpdate={handleTicketUpdate}
        />
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
