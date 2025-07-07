import { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import QRScanner from './components/QRScanner';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const handleScanSuccess = (decodedText: string) => {
    setLastResult(decodedText);
    console.log('QR код отсканирован:', decodedText);
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center' }}>QR Сканер</h1>

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
      />

      {lastResult && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Последний результат:</h3>
          <p style={{
            margin: 0,
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {lastResult}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
