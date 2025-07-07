import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { apiService } from '../services/api';
import type { LoginCredentials, User } from '../types/auth';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [credentials, setCredentials] = useState<LoginCredentials>({
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await apiService.login(credentials);
            onLoginSuccess({
                id: response.user_id,
                username: response.username,
                role_id: response.role_id,
                role: response.role
            });
            onClose();
            setCredentials({ username: '', password: '' });
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Ошибка авторизации');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof LoginCredentials) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setCredentials(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                width: '90%',
                maxWidth: '400px',
                position: 'relative'
            }}>
                {/* Заголовок с кнопкой закрытия */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ margin: 0, fontSize: '24px' }}>Авторизация</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Форма авторизации */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                        }}>
                            Логин:
                        </label>
                        <input
                            type="text"
                            value={credentials.username}
                            onChange={handleInputChange('username')}
                            required
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                        }}>
                            Пароль:
                        </label>
                        <input
                            type="password"
                            value={credentials.password}
                            onChange={handleInputChange('password')}
                            required
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#f8d7da',
                            color: '#721c24',
                            padding: '12px',
                            borderRadius: '4px',
                            marginBottom: '16px',
                            border: '1px solid #f5c6cb'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !credentials.username || !credentials.password}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: isLoading ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <LogIn size={20} />
                        {isLoading ? 'Авторизация...' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
