// ========== GAME CONFIG ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 700;

// Player data
let playerId = null;
let playerName = localStorage.getItem('playerName') || 'Player';
let playerCoins = 0;
let currentSkin = 'default';
let ownedSkins = ['default'];

// Position
let playerX = 400, playerY = 300;
let targetX = playerX, targetY = playerY;

// Movement flags (keyboard)
const keys = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  w: false, s: false, a: false, d: false
};

let lastMoveTime = 0;
const MOVE_SPEED = 200; // pixels per second

// Firebase references
let dbRef = null;
let playersRef = null;
let coinsRef = null;

// Other players
let otherPlayers = new Map();

// Coins
let coins = new Map();

// Skins
const skins = [
  { id: 'default', name: '🐱 Mặc định', price: 0, emoji: '🐱' },
  { id: 'ninja', name: '🥷 Ninja', price: 50, emoji: '🥷' },
  { id: 'wizard', name: '🧙 Phù thủy', price: 100, emoji: '🧙' },
  { id: 'vietnam_hat', name: '👒 Nón lá', price: 80, emoji: '👒' }
];

// NPC Data (new NPC about Vietnamese conical hat)
const npcHat = {
  id: 'hat_npc',
  x: 800, y: 500,
  name: '🌾 Bà Lão Bán Nón',
  avatar: 'npc_hat.png',
  dialogs: [
    "Chào con! Bà là người chuyên làm nón lá truyền thống Việt Nam đó.",
    "Nón lá có từ hàng nghìn năm nay, là biểu tượng của người phụ nữ Việt.",
    "Nón được làm từ lá cọ hoặc lá buông, khung tre, rất bền và mát.",
    "Ngày xưa, nón lá còn dùng để che mưa che nắng, làm quạt, thậm chí làm đồ đựng nước!",
    "Có rất nhiều loại nón: nón bài thơ (Huế), nón quai thao (Bắc Ninh), nón ngựa...",
    "Nón lá còn xuất hiện trong thơ ca: 'Nón lá che nghiêng nắng chiều, câu hò mái đẩy thương yêu dạt dào'.",
    "Con có muốn mua một chiếc nón lá trong shop không? Chỉ 80 coin thôi!",
    "Hãy nhấn 'Đổi Skin' và chọn nón lá nhé! Bà chúc con chơi vui!"
  ]
};

let npcSystem = null;
let joystick = null;
let joystickVector = { x: 0, y: 0 };

// ========== INITIALIZATION ==========
function init() {
  setupFirebase();
  setupInputs();
  setupCanvas();
  setupNPC();
  setupJoystick();
  gameLoop();
}

function setupFirebase() {
  firebase.auth().signInAnonymously().catch(console.error);
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      playerId = user.uid;
      dbRef = firebase.database().ref();
      playersRef = dbRef.child('players');
      coinsRef = dbRef.child('coins');
      
      // Save player to DB
      playersRef.child(playerId).set({
        name: playerName,
        x: playerX,
        y: playerY,
        skin: currentSkin,
        coins: playerCoins,
        ownedSkins: ownedSkins
      });
      
      // Load coins from server
      loadCoins();
      
      // Listen to other players
      playersRef.on('child_added', data => {
        if (data.key !== playerId) {
          otherPlayers.set(data.key, data.val());
        }
      });
      playersRef.on('child_changed', data => {
        if (data.key !== playerId) {
          otherPlayers.set(data.key, data.val());
        }
      });
      playersRef.on('child_removed', data => {
        otherPlayers.delete(data.key);
      });
      
      // Update own position continuously
      setInterval(updatePosition, 50);
    }
  });
}

function loadCoins() {
  coinsRef.on('child_added', snap => {
    coins.set(snap.key, snap.val());
  });
  coinsRef.on('child_changed', snap => {
    coins.set(snap.key, snap.val());
  });
  coinsRef.on('child_removed', snap => {
    coins.delete(snap.key);
  });
}

function updatePosition() {
  if (!playerId) return;
  playersRef.child(playerId).update({
    x: playerX,
    y: playerY,
    name: playerName,
    skin: currentSkin,
    coins: playerCoins
  });
}

function setupInputs() {
  // Keyboard movement
  const keyCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'];
  keyCodes.forEach(code => {
    new KeyPressListener(code, () => {});
  });
  
  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    else if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
  });
  
  // Name input
  const nameInput = document.getElementById('player-name');
  nameInput.value = playerName;
  nameInput.addEventListener('change', () => {
    playerName = nameInput.value;
    localStorage.setItem('playerName', playerName);
  });
  
  // Skin shop
  document.getElementById('change-skin').addEventListener('click', showSkinShop);
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('merchant-modal').style.display = 'none';
  });
  
  renderSkinShop();
}

function setupCanvas() {
  // Canvas click to move (PC)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    targetX = (e.clientX - rect.left) * scaleX;
    targetY = (e.clientY - rect.top) * scaleY;
  });
}

function setupNPC() {
  // Load avatar if exists
  const img = new Image();
  img.src = 'npc_hat.png'; // You can replace with actual image
  img.onload = () => { npcHat.avatarImg = img; };
  
  npcSystem = new NPCSystem(npcHat, canvas, () => ({ x: playerX, y: playerY }));
  npcSystem.setTalkCallback(() => {
    // Pause movement or other actions while talking
    console.log("Talking to NPC");
  });
}

function setupJoystick() {
  if (window.innerWidth <= 768) {
    joystick = new VirtualJoystick('joystickContainer', 'joystickThumb', (vec) => {
      joystickVector = vec;
      if (vec.x !== 0 || vec.y !== 0) {
        const speed = 300;
        playerX += vec.x * speed / 60;
        playerY += vec.y * speed / 60;
        // Clamp to canvas
        playerX = Math.min(Math.max(20, playerX), canvas.width - 20);
        playerY = Math.min(Math.max(20, playerY), canvas.height - 20);
        targetX = playerX;
        targetY = playerY;
      }
    });
  }
}

function showSkinShop() {
  renderSkinShop();
  document.getElementById('merchant-modal').style.display = 'block';
}

function renderSkinShop() {
  const container = document.getElementById('skin-shop-list');
  container.innerHTML = '';
  skins.forEach(skin => {
    const div = document.createElement('div');
    div.className = 'skin-item';
    div.innerHTML = `
      <div style="font-size:40px;">${skin.emoji}</div>
      <div>${skin.name}</div>
      <div>💰 ${skin.price}</div>
      <button ${ownedSkins.includes(skin.id) ? 'disabled' : ''} 
              onclick="buySkin('${skin.id}', ${skin.price})">
        ${ownedSkins.includes(skin.id) ? 'Đã sở hữu' : 'Mua'}
      </button>
    `;
    container.appendChild(div);
  });
}

window.buySkin = function(skinId, price) {
  if (ownedSkins.includes(skinId)) {
    alert('Bạn đã có skin này!');
    return;
  }
  if (playerCoins >= price) {
    playerCoins -= price;
    ownedSkins.push(skinId);
    updatePosition();
    renderSkinShop();
    alert(`Đã mua ${skins.find(s => s.id === skinId).name} thành công!`);
  } else {
    alert(`Không đủ coin! Cần ${price} coin.`);
  }
};

function changeSkin(skinId) {
  if (ownedSkins.includes(skinId)) {
    currentSkin = skinId;
    updatePosition();
  }
}

// ========== MOVEMENT UPDATE ==========
function updateMovement(deltaTime) {
  let moveX = 0, moveY = 0;
  
  // Keyboard input (Arrow keys + WASD)
  if (keys.ArrowUp || keys.w) moveY -= 1;
  if (keys.ArrowDown || keys.s) moveY += 1;
  if (keys.ArrowLeft || keys.a) moveX -= 1;
  if (keys.ArrowRight || keys.d) moveX += 1;
  
  // Joystick override if active
  if (joystick && (joystickVector.x !== 0 || joystickVector.y !== 0)) {
    moveX = joystickVector.x;
    moveY = joystickVector.y;
  }
  
  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    moveX /= len;
    moveY /= len;
    playerX += moveX * MOVE_SPEED * deltaTime;
    playerY += moveY * MOVE_SPEED * deltaTime;
    targetX = playerX;
    targetY = playerY;
  } else {
    // Mouse move (PC)
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    if (Math.hypot(dx, dy) > 2) {
      const angle = Math.atan2(dy, dx);
      playerX += Math.cos(angle) * MOVE_SPEED * deltaTime;
      playerY += Math.sin(angle) * MOVE_SPEED * deltaTime;
    }
  }
  
  // Clamp to canvas
  playerX = Math.min(Math.max(20, playerX), canvas.width - 20);
  playerY = Math.min(Math.max(20, playerY), canvas.height - 20);
  targetX = Math.min(Math.max(20, targetX), canvas.width - 20);
  targetY = Math.min(Math.max(20, targetY), canvas.height - 20);
}

// ========== COIN COLLECTION ==========
function checkCoinCollision() {
  for (let [id, coin] of coins) {
    const dx = playerX - coin.x;
    const dy = playerY - coin.y;
    if (Math.hypot(dx, dy) < 25) {
      playerCoins++;
      document.getElementById('player-coins').innerText = playerCoins;
      coinsRef.child(id).remove();
      break;
    }
  }
}

// ========== RENDERING ==========
function drawMap() {
  // Simple gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#5a8f4c');
  grad.addColorStop(1, '#3b5e2b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grass pattern
  ctx.fillStyle = '#6a9e5a';
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 2, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawCoins() {
  for (let coin of coins.values()) {
    ctx.font = '30px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 5;
    ctx.fillText('🪙', coin.x-15, coin.y-15);
  }
  ctx.shadowBlur = 0;
}

function drawPlayer(x, y, skinId, name, isLocal = true) {
  const skinEmoji = skins.find(s => s.id === skinId)?.emoji || '🐱';
  ctx.font = '40px Arial';
  ctx.fillStyle = isLocal ? '#fff' : '#ffccaa';
  ctx.shadowBlur = 2;
  ctx.fillText(skinEmoji, x-20, y-20);
  ctx.font = '12px Arial';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'black';
  ctx.fillText(name, x-25, y-30);
  
  if (isLocal) {
    ctx.beginPath();
    ctx.arc(x, y+5, 25, 0, 2*Math.PI);
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function draw() {
  drawMap();
  drawCoins();
  
  // Draw other players
  for (let [id, player] of otherPlayers) {
    drawPlayer(player.x, player.y, player.skin, player.name, false);
  }
  
  // Draw NPC
  if (npcSystem) npcSystem.draw(ctx);
  
  // Draw local player
  drawPlayer(playerX, playerY, currentSkin, playerName, true);
}

// ========== GAME LOOP ==========
let lastTime = 0;
function gameLoop(currentTime = 0) {
  const deltaTime = Math.min(0.033, (currentTime - lastTime) / 1000);
  if (deltaTime > 0) {
    updateMovement(deltaTime);
    checkCoinCollision();
    if (npcSystem) npcSystem.update();
    draw();
  }
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

// Start game
window.onload = init;
