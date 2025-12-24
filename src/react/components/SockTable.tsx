import React, { useState, useEffect } from 'react';

interface Sock {
  id: string;
  color: string;
  color_hex: string;
  style: string;
  clean: boolean;
  wear_count: number;
  photo_url?: string;
}

interface SockTableProps {
  initialSocks: Sock[];
}

const SockTable: React.FC<SockTableProps> = ({ initialSocks }) => {
  const [socks, setSocks] = useState<Sock[]>(initialSocks);
  const [filter, setFilter] = useState<'all' | 'clean' | 'dirty'>('all');

  const filteredSocks = socks.filter(sock => {
    if (filter === 'all') return true;
    if (filter === 'clean') return sock.clean;
    return !sock.clean;
  });

  const toggleCleanStatus = async (sockId: string) => {
    try {
      const response = await fetch(`/toggle_clean/${sockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setSocks(socks.map(sock => 
          sock.id === sockId ? { ...sock, clean: !sock.clean } : sock
        ));
      }
    } catch (error) {
      console.error('Error toggling clean status:', error);
    }
  };

  return (
    <div className="sock-table-container">
      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Все носки
        </button>
        <button 
          className={filter === 'clean' ? 'active' : ''}
          onClick={() => setFilter('clean')}
        >
          Чистые
        </button>
        <button 
          className={filter === 'dirty' ? 'active' : ''}
          onClick={() => setFilter('dirty')}
        >
          Грязные
        </button>
      </div>

      <div className="table-responsive">
        <table className="socks-table">
          <thead>
            <tr>
              <th>Фото</th>
              <th>Цвет</th>
              <th>Стиль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredSocks.map(sock => (
              <tr key={sock.id}>
                <td>
                  {sock.photo_url ? (
                    <img src={sock.photo_url} alt={sock.color} className="sock-photo" />
                  ) : (
                    <div 
                      className="photo-placeholder" 
                      style={{ backgroundColor: sock.color_hex }}
                    >
                      🧦
                    </div>
                  )}
                </td>
                <td>
                  <div className="color-display">
                    <span 
                      className="color-dot" 
                      style={{ backgroundColor: sock.color_hex }}
                    />
                    <span>{sock.color}</span>
                  </div>
                </td>
                <td>{sock.style}</td>
                <td>
                  <span className={`status ${sock.clean ? 'clean' : 'dirty'}`}>
                    {sock.clean ? '✅ Чистые' : '❌ Грязные'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => toggleCleanStatus(sock.id)}
                    className="toggle-btn"
                  >
                    {sock.clean ? 'Испачкать' : 'Постирать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SockTable;