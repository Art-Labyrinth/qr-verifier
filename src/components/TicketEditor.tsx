import React, { useState } from 'react';
import { X, Check, Edit } from 'lucide-react';
import { syncService } from '../services/sync';
import type { TicketInfo, ServerTicket } from '../types/auth';

// Тестовый билет: двузначное число в коде (PPP-NN-NNNN) меньше 10, кроме 07.
// «Меньше 10» для двузначного сегмента == ведущий ноль (/^0\d$/).
const isTestTicket = (code: string): boolean => {
  const segment = code.split('-')[1] || '';
  return /^0\d$/.test(segment) && segment !== '07';
};

interface TicketEditorProps {
  ticketInfo: TicketInfo;
  isAuthenticated: boolean;
  onUpdate: (updatedTicket: TicketInfo) => void;
  // Исход проверки билета: true — прошла, false — не прошла, null — нет данных проверки.
  verificationPassed?: boolean | null;
}

const TicketEditor: React.FC<TicketEditorProps> = ({ ticketInfo, isAuthenticated, onUpdate, verificationPassed }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    holder: ticketInfo.holder,
    active: ticketInfo.active,
    is_sold: ticketInfo.is_sold,
    comment: ticketInfo.comment || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveChanges = () => {
    if (!isAuthenticated) {
      alert('Требуется авторизация для редактирования');
      return;
    }

    setIsUpdating(true);

    // Подготавливаем обновления (без used)
    const updates: Partial<ServerTicket> = {
      holder: editData.holder,
      active: editData.active,
      is_sold: editData.is_sold,
      comment: editData.comment
    };

    const success = syncService.updateTicket(ticketInfo.code, updates);

    if (success) {
      // Обновляем локальное состояние
      const updatedTicket: TicketInfo = {
        ...ticketInfo,
        holder: editData.holder,
        active: editData.active,
        is_sold: editData.is_sold,
        comment: editData.comment
      };
      onUpdate(updatedTicket);
      setIsEditing(false);
    } else {
      alert('Ошибка при обновлении билета');
    }
    setIsUpdating(false);
  };

  const handleCancelEdit = () => {
    setEditData({
      holder: ticketInfo.holder,
      active: ticketInfo.active,
      is_sold: ticketInfo.is_sold,
      comment: ticketInfo.comment || ''
    });
    setIsEditing(false);
  };

  return (
    <div style={{
      marginTop: '20px',
      padding: '15px',
      // Красным выделяем только если проверка НЕ прошла; иначе блок нейтрально-зелёный.
      backgroundColor: verificationPassed === false ? '#f8d7da' : '#d4edda',
      border: `1px solid ${verificationPassed === false ? '#f5c6cb' : '#c3e6cb'}`,
      borderRadius: '5px'
    }}>
      {isTestTicket(ticketInfo.code) && (
        <div style={{
          backgroundColor: '#ff9800',
          color: '#000',
          fontWeight: 'bold',
          fontSize: '15px',
          textAlign: 'center',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '12px',
          border: '2px solid #e65100'
        }}>
          ⚠️ ТЕСТОВЫЙ БИЛЕТ
        </div>
      )}

      <h3 style={{ margin: '0 0 10px 0' }}>Информация о билете:</h3>

      <div style={{
        fontFamily: 'monospace',
        fontSize: '14px',
        marginBottom: '15px'
      }}>
        <p><strong>Код:</strong> {ticketInfo.code}</p>

        {/* Владелец */}
        <div style={{ marginBottom: '10px' }}>
          <strong>Владелец:</strong>
          {isEditing ? (
            <input
              type="text"
              value={editData.holder}
              onChange={(e) => setEditData({...editData, holder: e.target.value})}
              style={{
                marginLeft: '10px',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '14px'
              }}
            />
          ) : (
            <span style={{ marginLeft: '10px' }}>{ticketInfo.holder}</span>
          )}
        </div>

        <p><strong>Email:</strong> {ticketInfo.email}</p>
        <p><strong>Статус:</strong> {ticketInfo.status ? 'Действительный' : 'Недействительный'}</p>

        {/* Активен */}
        <div style={{ marginBottom: '10px' }}>
          <strong>Активен:</strong>
          {isEditing ? (
            <label style={{ marginLeft: '10px' }}>
              <input
                type="checkbox"
                checked={editData.active}
                onChange={(e) => setEditData({...editData, active: e.target.checked})}
                style={{ marginRight: '5px' }}
              />
              {editData.active ? 'Да' : 'Нет'}
            </label>
          ) : (
            <span style={{
              marginLeft: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '2px solid',
              borderColor: ticketInfo.active ? '#28a745' : '#dc3545'
            }}>
              {ticketInfo.active ? 'Да' : 'Нет'}
            </span>
          )}
        </div>

        {/* Оплачен */}
        <div style={{ marginBottom: '10px' }}>
          <strong>Оплачен:</strong>
          {isEditing ? (
            <label style={{ marginLeft: '10px' }}>
              <input
                type="checkbox"
                checked={editData.is_sold}
                onChange={(e) => setEditData({...editData, is_sold: e.target.checked})}
                style={{ marginRight: '5px' }}
              />
              {editData.is_sold ? 'Да' : 'Нет'}
            </label>
          ) : (
            <span style={{
              marginLeft: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '2px solid',
              borderColor: ticketInfo.is_sold ? '#28a745' : '#dc3545'
            }}>
              {ticketInfo.is_sold ? 'Да' : 'Нет'}
            </span>
          )}
        </div>

        {/* Использован - только отображение, без редактирования */}
        <div style={{ marginBottom: '10px' }}>
          <strong>Использован:</strong>
          <span style={{
            marginLeft: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            border: '2px solid',
            borderColor: !ticketInfo.used ? '#28a745' : '#dc3545'
          }}>
            {ticketInfo.used ? `Да (${new Date(ticketInfo.used).toLocaleString()})` : 'Нет'}
          </span>
        </div>

        {/* Автоматическая регистрация - только при наличии авторизации */}
        {/* {isAuthenticated && !ticketInfo.used && (
          <div style={{
            marginBottom: '10px',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>Автоматическая регистрация:</strong>
            {ticketInfo.active && ticketInfo.is_sold ? (
              <span style={{ color: '#28a745', marginLeft: '5px' }}>
                ✓ Билет будет автоматически зарегистрирован при сканировании
              </span>
            ) : (
              <div style={{ marginTop: '4px' }}>
                {!ticketInfo.active && <div style={{ color: '#dc3545' }}>✗ Билет не активен</div>}
                {!ticketInfo.is_sold && <div style={{ color: '#dc3545' }}>✗ Билет не оплачен</div>}
              </div>
            )}
          </div>
        )} */}

        <p><strong>Создан:</strong> {ticketInfo.created_at && new Date(ticketInfo.created_at).toLocaleString()}</p>

        {/* Комментарий */}
        <div style={{ marginTop: '10px' }}>
          <strong>Комментарий:</strong>
          {isEditing ? (
            <div style={{ marginTop: '5px' }}>
              <textarea
                value={editData.comment}
                onChange={(e) => setEditData({...editData, comment: e.target.value})}
                placeholder="Введите комментарий..."
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
          ) : (
            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ flex: 1 }}>{ticketInfo.comment || 'Не указан'}</span>
              {isAuthenticated && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <Edit size={12} />
                  Редактировать
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Кнопки действий (только в режиме редактирования) */}
      {isAuthenticated && isEditing && (
        <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveChanges}
              disabled={isUpdating}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: isUpdating ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} />
              {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isUpdating}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <X size={16} />
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketEditor;
