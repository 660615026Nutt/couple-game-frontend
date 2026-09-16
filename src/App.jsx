import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// เชื่อมต่อไปหา Backend (ถ้าเอาไปขึ้นเว็บจริง ต้องเปลี่ยนเป็นลิงก์ Server จริง)
const socket = io('https://couple-game-api-olav.onrender.com');

const cardGuide = [
  { type: 'defuse', name: '🛡️ การ์ดง้อ', desc: 'มีติดมือไว้ป้องกัน "ระเบิดความงอน" (ระบบใช้ให้อัตโนมัติ)' },
  { type: 'skip', name: '⏭️ ชิ่งหนี', desc: 'จบเทิร์นของคุณทันทีโดยไม่ต้องจั่ว' },
  { type: 'attack', name: '⚔️ โจมตี', desc: 'จบเทิร์นทันที และบังคับอีกฝ่ายเล่น 2 ตาติด!' },
  { type: 'see', name: '👁️ แอบดู', desc: 'แอบดูการ์ด 3 ใบบนสุด (แสดงแจ้งเตือน)' },
  { type: 'task', name: '📜 ภารกิจ', desc: 'สั่งให้อีกฝ่ายทำภารกิจที่เขียนไว้บนการ์ด!' },
  { type: 'bomb', name: '💣 ระเบิดความงอน', desc: 'ถ้าจั่วเจอใบนี้แล้วไม่มี "การ์ดง้อ" แพ้ทันที!' },
];

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [roomStatusMsg, setRoomStatusMsg] = useState('');
  
  // State ของเกมที่รับมาจาก Server
  const [gameState, setGameState] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // รับสถานะห้อง (เวลามีคนเข้าห้อง)
    socket.on('roomStatus', (data) => {
      setRoomStatusMsg(data.message);
    });

    // รับข้อมูลเกมที่อัปเดตจาก Server
    socket.on('gameState', (state) => {
      setGameState(state);
    });

    // รับข้อความแจ้งเตือนพิเศษ (เช่น โดนสั่งภารกิจ หรือ แอบดูไพ่)
    socket.on('alert', (msg) => {
      alert(msg);
    });

    // รับข้อความ Error
    socket.on('error', (msg) => {
      alert(msg);
      setIsJoined(false);
    });

    return () => {
      socket.off('roomStatus');
      socket.off('gameState');
      socket.off('alert');
      socket.off('error');
    };
  }, []);

  const joinRoom = () => {
    if (!roomId.trim() || !playerName.trim()) {
      alert('กรุณากรอกชื่อและรหัสห้องให้ครบถ้วน');
      return;
    }
    socket.emit('joinRoom', { roomId, playerName });
    setIsJoined(true);
  };

  const drawCard = () => {
    socket.emit('drawCard', roomId);
  };

  const playCard = (cardIndex) => {
    const card = gameState.myHand[cardIndex];
    if (card.type === 'defuse') {
      alert('การ์ดง้อเอาไว้ป้องกันระเบิดอัตโนมัติ กดใช้เองไม่ได้นะ!');
      return;
    }
    socket.emit('playCard', { roomId, cardIndex });
  };

  // --- หน้าจอ 1: ล็อบบี้ (ยังไม่ได้เข้าห้อง) ---
  if (!isJoined) {
    return (
      <div className="game-container flex-center">
        <div className="setup-box">
          <h1 className="title">ดงระเบิด ทายใจ 💣</h1>
          <p>เข้าสู่ระบบโต๊ะเกม</p>
          <input 
            type="text" 
            placeholder="ชื่อของคุณ (เช่น นัทจัง)" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)}
            className="name-input"
          />
          <input 
            type="text" 
            placeholder="รหัสห้อง (เช่น 1234)" 
            value={roomId} 
            onChange={(e) => setRoomId(e.target.value)}
            className="name-input"
          />
          <button className="btn-draw" style={{marginTop: '10px', width: '100%'}} onClick={joinRoom}>
            เข้าห้องเกม!
          </button>
        </div>
      </div>
    );
  }

  // --- หน้าจอ 2: ห้องรอก่อนเกมเริ่ม ---
  if (!gameState) {
    return (
      <div className="game-container flex-center">
        <div className="setup-box">
          <h2 style={{color: '#4f46e5'}}>รหัสห้อง: {roomId}</h2>
          <p>{roomStatusMsg}</p>
          <div className="loader">กำลังรอผู้เล่นคนที่ 2...</div>
        </div>
      </div>
    );
  }

  // --- หน้าจอ 3: กระดานเกมหลัก ---
  const myTurn = gameState.turnId === socket.id;
  const opponent = gameState.players.find(p => p.id !== socket.id);

  return (
    <div className="game-container">
      <div className="header-row">
        <h1 className="title" style={{fontSize: '24px'}}>ห้อง: {roomId}</h1>
        <button className="btn-guide" onClick={() => setShowGuide(true)}>📖 คู่มือ</button>
      </div>

      <div className="status-board">
        <p className="turn-info">
          ตาของ: <strong className={myTurn ? 'p1-text' : 'p2-text'}>{gameState.turnName}</strong> 
          {gameState.turnsToTake > 1 && ` (ต้องเล่นอีก ${gameState.turnsToTake} ตา)`}
        </p>
        <p className="message-box">{gameState.message}</p>
      </div>

      <div className="deck-area">
        {!gameState.gameOver ? (
          <button className={`btn-draw ${!myTurn ? 'disabled' : ''}`} onClick={drawCard} disabled={!myTurn}>
            จั่วการ์ด (เหลือกองกลาง {gameState.deckCount} ใบ)
          </button>
        ) : (
          <div className="message-box" style={{fontSize: '24px'}}>จบเกมแล้ว!</div>
        )}
      </div>

      <div className="board" style={{ flexDirection: 'column' }}>
        
        {/* พื้นที่ของคู่แข่ง (แสดงเฉพาะหลังการ์ด) */}
        <div className={`player-area ${!myTurn ? 'active-player' : 'inactive-player'}`} style={{width: '100%'}}>
          <h2>{opponent ? opponent.name : 'คู่แข่ง'} (ไพ่ในมือ: {gameState.opponentHandCount} ใบ)</h2>
          <div className="hand">
            {Array.from({ length: gameState.opponentHandCount }).map((_, index) => (
              <div key={`opp-${index}`} className="card card-back">?</div>
            ))}
          </div>
        </div>

        {/* พื้นที่ของเรา (แสดงไพ่ที่กดเล่นได้) */}
        <div className={`player-area ${myTurn ? 'active-player' : 'inactive-player'}`} style={{width: '100%', marginTop: '20px'}}>
          <h2>ไพ่บนมือคุณ ({playerName})</h2>
          <div className="hand">
            {gameState.myHand.map((card, index) => (
              <div 
                key={index} 
                className={`card ${card.type} ${myTurn ? 'playable' : ''}`} 
                onClick={() => myTurn && playCard(index)}
              >
                <strong>{card.name}</strong>
                {card.desc && <span className="card-desc">{card.desc}</span>}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* เมนูคู่มือการ์ด */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📖 คู่มือการ์ด</h2>
            <ul className="guide-list">
              {cardGuide.map((item, idx) => (
                <li key={idx}>
                  <div className={`guide-card-icon ${item.type}`}></div>
                  <div className="guide-text">
                    <strong>{item.name}</strong>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button className="btn-close" onClick={() => setShowGuide(false)}>ปิดคู่มือ</button>
          </div>
        </div>
      )}
    </div>
  );
}