import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('https://couple-game-api-olav.onrender.com');

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedGame, setSelectedGame] = useState('uno'); 
  const [isJoined, setIsJoined] = useState(false);
  
  const [gameState, setGameState] = useState(null);
  
  // State สำหรับหน้าต่างเลือกสีไพ่ Wild
  const [pickingWildIndex, setPickingWildIndex] = useState(null);

  useEffect(() => {
    socket.on('gameState', (state) => setGameState(state));
    socket.on('alert', (msg) => alert(msg));
    return () => { socket.off('gameState'); socket.off('alert'); };
  }, []);

  const joinRoom = () => {
    if (!roomId.trim() || !playerName.trim()) return;
    socket.emit('joinRoom', { roomId, playerName, gameType: selectedGame });
    setIsJoined(true);
  };

  const handlePlayCard = (index) => {
    const card = gameState.myHand[index];
    // ถ้าลงไพ่เปลี่ยนสี หรือ +4 ต้องเด้งหน้าต่างให้เลือกสีก่อน
    if (gameState.gameType === 'uno' && card.color === 'wild') {
      setPickingWildIndex(index);
    } else {
      socket.emit('playCard', { roomId, cardIndex: index });
    }
  };

  const confirmWildColor = (color) => {
    socket.emit('playCard', { roomId, cardIndex: pickingWildIndex, selectedColor: color });
    setPickingWildIndex(null);
  };

  if (!isJoined) {
    return (
      <div className="game-container flex-center">
        <div className="setup-box">
          <h1 className="title">ศูนย์รวมเกมคู่รัก 💕</h1>
          <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="name-input" style={{ fontWeight: 'bold', color: '#fb7185' }}>
            <option value="uno">🃏 เกม 2: UNO Full Option</option>
            <option value="bomb">💣 เกม 1: ดงระเบิดทายใจ</option>
          </select>
          <input type="text" placeholder="ชื่อของคุณ" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="name-input" />
          <input type="text" placeholder="รหัสห้อง" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="name-input" />
          <button className="btn-draw" style={{width: '100%'}} onClick={joinRoom}>เข้าห้องเกม!</button>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="game-container flex-center"><h2>รอแฟนเข้าห้อง {roomId}...</h2></div>;

  const myTurn = gameState.turnId === socket.id;
  const opponent = gameState.players.find(p => p.id !== socket.id);

  return (
    <div className="game-container relative">
      
      {/* ปุ่มแพนิค: UNO 3 วินาที! */}
      {gameState.unoPendingId === socket.id && (
        <button className="panic-btn uno-btn" onClick={() => socket.emit('callUno', roomId)}>
          🔴 รีบกด UNO!!
        </button>
      )}
      
      {/* ปุ่มแพนิค: UNO WIN! */}
      {gameState.winPendingId === socket.id && (
        <button className="panic-btn win-btn" onClick={() => socket.emit('callUnoWin', roomId)}>
          🏆 กด UNO WIN!!
        </button>
      )}

      {/* หน้าต่างเลือกสีสำหรับไพ่ Wild */}
      {pickingWildIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign:'center', maxWidth:'300px'}}>
            <h2>เลือกสีที่ต้องการ</h2>
            <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
              <button className="color-btn red" onClick={() => confirmWildColor('red')}></button>
              <button className="color-btn blue" onClick={() => confirmWildColor('blue')}></button>
              <button className="color-btn green" onClick={() => confirmWildColor('green')}></button>
              <button className="color-btn yellow" onClick={() => confirmWildColor('yellow')}></button>
            </div>
            <button className="btn-close" style={{marginTop:'20px'}} onClick={()=>setPickingWildIndex(null)}>ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 className="title">{gameState.gameType === 'uno' ? 'UNO รุ่นทำลายมิตรภาพ 🃏' : 'ดงระเบิด 💣'}</h1>
        <button onClick={() => { if(window.confirm('เริ่มเกมใหม่เลยไหม?')) socket.emit('restartGame', roomId) }} className="btn-guide">🔄 เริ่มใหม่</button>
      </div>

      <div className="status-board">
        <p className="turn-info">ตาของ: <strong>{gameState.turnName}</strong></p>
        <p className="message-box">{gameState.message}</p>
      </div>

      {gameState.gameType === 'uno' && gameState.topCard && (
        <div style={{ margin: '15px auto', textAlign: 'center' }}>
          <p style={{color:'#64748b'}}>กองกลาง (สีที่เล่นได้: <span className={`txt-${gameState.activeColor}`}>{gameState.activeColor}</span>)</p>
          <div className={`card uno-card ${gameState.topCard.color === 'wild' ? gameState.activeColor : gameState.topCard.color}`} style={{ margin: '0 auto', transform: 'scale(1.2)' }}>
            <strong>{gameState.topCard.name}</strong>
          </div>
        </div>
      )}

      <div className="deck-area">
        {!gameState.gameOver && (
          <button className={`btn-draw ${!myTurn ? 'disabled' : ''}`} onClick={() => socket.emit('drawCard', roomId)} disabled={!myTurn}>
            {gameState.penaltyCount > 0 ? `🔥 ยอมรับกรรม จั่ว ${gameState.penaltyCount} ใบ!` : `จั่วการ์ด (${gameState.deckCount} ใบ)`}
          </button>
        )}
      </div>

      <div className="board" style={{ flexDirection: 'column' }}>
        <div className={`player-area ${!myTurn ? 'active-player' : 'inactive-player'}`} style={{width: '100%'}}>
          <h2>{opponent ? opponent.name : 'คู่แข่ง'} ({gameState.opponentHandCount} ใบ)</h2>
        </div>

        <div className={`player-area ${myTurn ? 'active-player' : 'inactive-player'}`} style={{width: '100%', marginTop: '20px'}}>
          <h2>ไพ่ของคุณ</h2>
          <div className="hand">
            {gameState.myHand.map((card, index) => (
              <div 
                key={index} 
                className={`card ${card.type} ${card.color} ${myTurn ? 'playable' : ''}`} 
                onClick={() => myTurn && handlePlayCard(index)}
              >
                <strong style={gameState.gameType === 'uno' ? {fontSize: '28px', color: card.color==='yellow'?'#333':'white'} : {}}>{card.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}