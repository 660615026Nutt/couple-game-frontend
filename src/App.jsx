import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('https://couple-game-api-olav.onrender.com'); // เปลี่ยนลิงก์เป็น IP หรือ Render ของคุณ

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedGame, setSelectedGame] = useState('bomb'); // เลือกว่าจะเล่นเกมไหน
  const [isJoined, setIsJoined] = useState(false);
  
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    socket.on('gameState', (state) => setGameState(state));
    socket.on('alert', (msg) => alert(msg));
    return () => {
      socket.off('gameState');
      socket.off('alert');
    };
  }, []);

  const joinRoom = () => {
    if (!roomId.trim() || !playerName.trim()) return;
    socket.emit('joinRoom', { roomId, playerName, gameType: selectedGame });
    setIsJoined(true);
  };

  // --- 1. หน้าตั้งค่าก่อนเข้าห้อง ---
  if (!isJoined) {
    return (
      <div className="game-container flex-center">
        <div className="setup-box">
          <h1 className="title">ศูนย์รวมเกมคู่รัก 💕</h1>
          <select 
            value={selectedGame} 
            onChange={(e) => setSelectedGame(e.target.value)}
            className="name-input"
            style={{ fontWeight: 'bold', color: '#e11d48' }}
          >
            <option value="bomb">💣 เกม 1: ดงระเบิดทายใจ</option>
            <option value="uno">🃏 เกม 2: มินิ UNO</option>
          </select>
          <input 
            type="text" placeholder="ชื่อของคุณ" 
            value={playerName} onChange={(e) => setPlayerName(e.target.value)}
            className="name-input"
          />
          <input 
            type="text" placeholder="รหัสห้อง (เช่น 1234)" 
            value={roomId} onChange={(e) => setRoomId(e.target.value)}
            className="name-input"
          />
          <button className="btn-draw" style={{marginTop: '10px', width: '100%'}} onClick={joinRoom}>
            เข้าห้องเกม!
          </button>
        </div>
      </div>
    );
  }

  // --- 2. หน้าจอรอก่อนเริ่ม ---
  if (!gameState) {
    return (
      <div className="game-container flex-center">
        <h2>รอแฟนเข้าห้อง {roomId}...</h2>
      </div>
    );
  }

  // --- 3. หน้ากระดานเกม ---
  const myTurn = gameState.turnId === socket.id;
  const opponent = gameState.players.find(p => p.id !== socket.id);

  return (
    <div className="game-container">
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 className="title">{gameState.gameType === 'uno' ? 'มินิ UNO 🃏' : 'ดงระเบิด 💣'}</h1>
        
        {/* ปุ่มเริ่มเกมใหม่ กดได้ตลอดเวลา */}
        <button 
          onClick={() => { if(window.confirm('เริ่มเกมใหม่เลยไหม?')) socket.emit('restartGame', roomId) }}
          style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          🔄 เริ่มเกมใหม่
        </button>
      </div>

      <div className="status-board">
        <p className="turn-info">ตาของ: <strong>{gameState.turnName}</strong></p>
        <p className="message-box">{gameState.message}</p>
      </div>

      {/* พื้นที่พิเศษสำหรับ UNO: ไพ่กองกลาง */}
      {gameState.gameType === 'uno' && gameState.topCard && (
        <div style={{ margin: '20px auto', textAlign: 'center' }}>
          <p>ไพ่กองกลาง</p>
          <div className={`card uno-card ${gameState.topCard.color}`} style={{ margin: '0 auto', transform: 'scale(1.2)' }}>
            <strong>{gameState.topCard.name}</strong>
          </div>
        </div>
      )}

      <div className="deck-area">
        {!gameState.gameOver && (
          <button className={`btn-draw ${!myTurn ? 'disabled' : ''}`} onClick={() => socket.emit('drawCard', roomId)} disabled={!myTurn}>
            จั่วการ์ด (เหลือ {gameState.deckCount} ใบ)
          </button>
        )}
      </div>

      <div className="board" style={{ flexDirection: 'column' }}>
        <div className={`player-area ${!myTurn ? 'active-player' : 'inactive-player'}`} style={{width: '100%'}}>
          <h2>{opponent ? opponent.name : 'คู่แข่ง'} ({gameState.opponentHandCount} ใบ)</h2>
          <div className="hand">
            {Array.from({ length: gameState.opponentHandCount }).map((_, i) => (
              <div key={i} className="card card-back">?</div>
            ))}
          </div>
        </div>

        <div className={`player-area ${myTurn ? 'active-player' : 'inactive-player'}`} style={{width: '100%', marginTop: '20px'}}>
          <h2>ไพ่ของคุณ</h2>
          <div className="hand">
            {gameState.myHand.map((card, index) => (
              <div 
                key={index} 
                // เพิ่มสีให้ไพ่ UNO
                className={`card ${card.type} ${card.color ? card.color : ''} ${myTurn ? 'playable' : ''}`} 
                onClick={() => myTurn && socket.emit('playCard', { roomId, cardIndex: index })}
              >
                <strong style={gameState.gameType === 'uno' ? {fontSize: '32px', color: 'white'} : {}}>{card.name}</strong>
                {card.desc && <span className="card-desc">{card.desc}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}