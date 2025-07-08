import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface AddTicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: { holder: string; type: string; comment: string }) => void;
  isLoading: boolean;
}

const ticketTypes = {
  'G': 'Гость',
  'M': 'Мастер',
  'V': 'Волонтер',
  'O': 'Организатор',
  'S': 'Семейный',
  'F': 'Друзья',
  'L': 'Льготный',
  'C': 'Гость'
};

const AddTicketForm: React.FC<AddTicketFormProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    holder: '',
    type: 'G',
    comment: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.holder.trim()) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({ holder: '', type: 'G', comment: '' });
    onClose();
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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Добавить новый билет</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '4px',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Имя владельца */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              Имя владельца:
            </label>
            <input
              type="text"
              value={formData.holder}
              onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
              placeholder="Введите имя владельца билета"
              disabled={isLoading}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                opacity: isLoading ? 0.5 : 1
              }}
            />
          </div>

          {/* Тип билета */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              Тип билета:
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {Object.entries(ticketTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Комментарий */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              Комментарий:
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Дополнительная информация о билете"
              disabled={isLoading}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                opacity: isLoading ? 0.5 : 1
              }}
            />
          </div>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={isLoading || !formData.holder.trim()}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: isLoading || !formData.holder.trim() ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading || !formData.holder.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              {isLoading ? 'Создание...' : 'Создать билет'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTicketForm;
