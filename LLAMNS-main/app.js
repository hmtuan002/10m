// ========== PHẦN 1: GIỮ NGUYÊN CODE CŨ CỦA BẠN ==========
// KeyPressListener class (giữ nguyên 100%)
class KeyPressListener {
  constructor(keyCode, callback) {
    let keySafe = true;
    this.keydownFunction = function(event) {
      if (event.code === keyCode) {
         if (keySafe) {
            keySafe = false;
            callback();
         }  
      }
   };
   this.keyupFunction = function(event) {
      if (event.code === keyCode) {
         keySafe = true;
      }         
   };
   document.addEventListener("keydown", this.keydownFunction);
   document.addEventListener("keyup", this.keyupFunction);
  }

  unbind() { 
    document.removeEventListener("keydown", this.keydownFunction);
    document.removeEventListener("keyup", this.keyupFunction);
  }
}

// ========== PHẦN 2: KHỞI TẠO CANVAS VÀ GAME ==========
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.querySelector('.game-container').appendChild(canvas);
canvas.width = 1200;
canvas.height = 700;

// ========== BIẾN GAME ==========
let playerId = null;
let playerName = localStorage.getItem('playerName') || 'Player';
let playerCoins = 0;
let currentSkin = 'default';
let ownedSkins = ['default'];

// Vị trí người chơi
let playerX = canvas.width / 2;
let playerY = canvas.height / 2;
let targetX = playerX;
let targetY = playerY;

// Firebase
let dbRef = null;
let playersRef = null;
let coinsRef = null;
let otherPlayers = new Map();
let coins = new Map();

// Skin data
const skins = [
  { id: 'default', name: '🐱 Mặc định', price: 0, emoji: '🐱' },
  { id: 'ninja', name: '🥷 Ninja', price: 50, emoji: '🥷' },
  { id: 'wizard', name: '🧙 Phù thủy', price: 100, emoji: '🧙' },
  { id: 'vietnam_hat', name: '👒 Nón lá Việt Nam', price: 80, emoji: '👒' }
];

// ========== PHẦN 3: THÊM MỚI - NPC BÀ LÃO NÓN LÁ ==========
const hatNpc = {
  id: 'hat_npc',
  x: 950,  // Đặt vị trí phù hợp với map của bạn
  y: 550,
  name: '🌾 Bà Lão Bán Nón Lá',
  dialogs: [
    "✨ Chào con! Bà là người làm nón lá truyền thống Việt Nam đây.",
    "🌿 Nón lá có từ hàng nghìn năm trước, gắn liền với hình ảnh người phụ nữ Việt Nam.",
    "🎋 Nón được làm từ lá cọ hoặc lá buông, khung tre uốn cong rất tinh xảo.",
    "📜 Có nhiều loại nón nổi tiếng: nón Bài Thơ (Huế), nón Quai Thao (Bắc Ninh), nón Ngựa...",
    "🌸 Nón lá còn xuất hiện trong thơ ca: 'Nón lá che nghiêng nắng chiều, câu hò mái đẩy thương yêu dạt dào'.",
    "💰 Con có thể mua nón lá trong cửa hàng skin với giá 80 xu!",
    "🎁 Bà chúc con chơi game vui vẻ và luôn nhớ về văn hóa Việt Nam nhé!",
    "👋 Nếu cần gì, cứ đến gặp bà nha con!"
  ]
};

let npcSystem = null;

// ========== PHẦN 4: THÊM MỚI - JOYSTICK VÀ ĐIỀU KHIỂN ==========
let joystick = null;
let joystickVector = { x: 0, y: 0 };
const MOVE_SPEED = 280;

// Hỗ trợ cả mũi tên và WASD
const keys = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  KeyW: false, KeyS: false, KeyA: false, KeyD: false
};

// ========== PHẦN 5: FIREBASE SETUP (GIỮ NGUYÊN CẤU TRÚC CŨ) ==========
function setupFirebase() {
  firebase.auth().signInAnonymously().catch(console.error);
  
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      playerId = user.uid;
      dbRef = firebase.database().ref();
      playersRef = dbRef.child('players');
      coinsRef = dbRef.child('coins');
      
      // Lưu player
      playersRef.child(playerId).set({
        name: playerName,
        x: playerX,
        y: playerY,
        skin: currentSkin,
        coins: playerCoins,
        ownedSkins: ownedSkins
      });
      
      // Lắng nghe coin
      coinsRef.on('child_added', snap => coins.set(snap.key, snap.val()));
      coinsRef.on('child_changed', snap => coins.set(snap.key, snap.val()));
      coinsRef.on('child_removed', snap => coins.delete(snap.key));
      
      // Lắng nghe người chơi khác
      playersRef.on('child_added', data => {
        if (data.key !== playerId) otherPlayers.set(data.key, data.val());
      });
      playersRef.on('child_changed', data => {
        if (data.key !== playerId) otherPlayers.set(data.key, data.val());
      });
      playersRef.on('child_removed', data => otherPlayers.delete(data.key));
      
      // Cập nhật vị trí định kỳ
      setInterval(updateServerPosition, 50);
    }
  });
}

function updateServerPosition() {
  if (!playerId || !playersRef) return;
  playersRef.child(playerId).update({
    x: playerX, y: playerY, name: playerName, skin: currentSkin, coins: playerCoins
  });
}

// ========== PHẦN 6: SETUP INPUT (THÊM WASD VÀ JOYSTICK) ==========
function setupInputs() {
  // Keyboard - mũi tên + WASD
  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
      keys[e.code] = true;
      e.preventDefault();
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
      keys[e.code] = false;
    }
  });
  
  // Click chuột để di chuyển
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    targetX = (e.clientX - rect.left) * scaleX;
    targetY = (e.clientY - rect.top) * scaleY;
  });
  
  // Name input
  const nameInput = document.getElementById('player-name');
  if (nameInput) {
    nameInput.value = playerName;
    nameInput.addEventListener('change', () => {
      playerName = nameInput.value.substring(0, 10);
      localStorage.setItem('playerName', playerName);
    });
  }
  
  // Skin shop
  const changeSkinBtn = document.getElementById('change-skin');
  if (changeSkinBtn) {
    changeSkinBtn.addEventListener('click', showSkinShop);
  }
  
  const closeModal = document.getElementById('close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      document.getElementById('merchant-modal').style.display = 'none';
    });
  }
  
  renderSkinShop();
}

// ========== PHẦN 7: SKIN SHOP ==========
function showSkinShop() {
  renderSkinShop();
  const modal = document.getElementById('merchant-modal');
  if (modal) modal.style.display = 'block';
}

function renderSkinShop() {
  const container = document.getElementById('skin-shop-list');
  if (!container) return;
  container.innerHTML = '';
  
  skins.forEach(skin => {
    const div = document.createElement('div');
    div.className = 'skin-item';
    div.innerHTML = `
      <div style="font-size:40px;">${skin.emoji}</div>
      <div>${skin.name}</div>
      <div>💰 ${skin.price}</div>
      <button ${ownedSkins.includes(skin.id) ? 'disabled' : ''} 
              onclick="window.buySkin('${skin.id}', ${skin.price})">
        ${ownedSkins.includes(skin.id) ? '✅ Đã sở hữu' : '🛒 Mua'}
      </button>
    `;
    container.appendChild(div);
  });
}

window.buySkin = function(skinId, price) {
  if (ownedSkins.includes(skinId)) {
    alert('Bạn đã có skin này rồi!');
    return;
  }
  if (playerCoins >= price) {
    playerCoins -= price;
    ownedSkins.push(skinId);
    updateServerPosition();
    renderSkinShop();
    document.getElementById('player-coins').innerText = playerCoins;
    alert(`🎉 Đã mua ${skins.find(s => s.id === skinId).name} thành công!`);
  } else {
    alert(`💰 Không đủ coin! Cần ${price} coin.`);
  }
};

// ========== PHẦN 8: THÊM MỚI - SETUP NPC ==========
function setupNPC() {
  npcSystem = new NPCSystem(hatNpc, canvas, () => ({ x: playerX, y: playerY }));
}

// ========== PHẦN 9: THÊM MỚI - SETUP JOYSTICK ==========
function setupJoystick() {
  if (window.innerWidth <= 768) {
    joystick = new VirtualJoystick('joystickContainer', 'joystickThumb', (vec) => {
      joystickVector = vec;
    });
  }
}

// ========== PHẦN 10: DI CHUYỂN (THÊM JOYSTICK + WASD) ==========
function updateMovement(deltaTime) {
  let moveX = 0, moveY = 0;
  
  // Keyboard: mũi tên + WASD
  if (keys.ArrowUp || keys.KeyW) moveY -= 1;
  if (keys.ArrowDown || keys.KeyS) moveY += 1;
  if (keys.ArrowLeft || keys.KeyA) moveX -= 1;
  if (keys.ArrowRight || keys.KeyD) moveX += 1;
  
  // Joystick (mobile)
  if (joystick && (joystickVector.x !== 0 || joystickVector.y !== 0)) {
    moveX = joystickVector.x;
    moveY = joystickVector.y;
  }
  
  // Di chuyển theo phím hoặc joystick
  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    moveX /= len;
    moveY /= len;
    playerX += moveX * MOVE_SPEED * deltaTime;
    playerY += moveY * MOVE_SPEED * deltaTime;
    targetX = playerX;
    targetY = playerY;
  } 
  // Di chuyển theo click chuột
  else {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.hypot(dx, dy);
    if (distance > 5) {
      const angle = Math.atan2(dy, dx);
      playerX += Math.cos(angle) * MOVE_SPEED * deltaTime;
      playerY += Math.sin(angle) * MOVE_SPEED * deltaTime;
    }
  }
  
  // Giới hạn trong canvas
  playerX = Math.min(Math.max(30, playerX), canvas.width - 30);
  playerY = Math.min(Math.max(30, playerY), canvas.height - 30);
  targetX = Math.min(Math.max(30, targetX), canvas.width - 30);
  targetY = Math.min(Math.max(30, targetY), canvas.height - 30);
}

// ========== PHẦN 11: NHẶT COIN ==========
function checkCoinCollection() {
  for (let [id, coin] of coins) {
    const dx = playerX - coin.x;
    const dy = playerY - coin.y;
    if (Math.hypot(dx, dy) < 30) {
      playerCoins += coin.value || 1;
      document.getElementById('player-coins').innerText = playerCoins;
      coinsRef.child(id).remove();
      break;
    }
  }
}

// ========== PHẦN 12: RENDER GAME (GIỮ NGUYÊN STYLE CŨ) ==========
function drawBackground() {
  // Nền gradient xanh lá
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#5a9e4e');
  grad.addColorStop(1, '#3b6e2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Cỏ
  ctx.fillStyle = '#6aae5a';
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc((i * 131) % canvas.width, (i * 253) % canvas.height, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoins() {
  for (let coin of coins.values()) {
    ctx.font = '30px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 5;
    ctx.fillText('🪙', coin.x - 15, coin.y - 15);
  }
  ctx.shadowBlur = 0;
}

function drawOtherPlayers() {
  for (let [id, player] of otherPlayers) {
    if (player.x && player.y) {
      const skinEmoji = skins.find(s => s.id === player.skin)?.emoji || '🐱';
      ctx.font = '40px Arial';
      ctx.fillStyle = '#ffccaa';
      ctx.fillText(skinEmoji, player.x - 20, player.y - 20);
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(player.name || '???', player.x - 25, player.y - 35);
    }
  }
}

function drawPlayer() {
  const skinEmoji = skins.find(s => s.id === currentSkin)?.emoji || '🐱';
  
  // Shadow
  ctx.beginPath();
  ctx.arc(playerX, playerY + 5, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  
  // Nhân vật
  ctx.font = '44px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(skinEmoji, playerX - 22, playerY - 22);
  
  // Tên
  ctx.font = 'bold 12px "Source Sans Pro"';
  ctx.fillStyle = 'white';
  ctx.shadowBlur = 2;
  ctx.fillText(playerName, playerX - 25, playerY - 35);
  
  // Vòng tròn highlight
  ctx.beginPath();
  ctx.arc(playerX, playerY, 28, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.shadowBlur = 0;
}

function draw() {
  drawBackground();
  drawCoins();
  drawOtherPlayers();
  
  // Vẽ NPC (THÊM MỚI)
  if (npcSystem) npcSystem.draw(ctx);
  
  drawPlayer();
}

// ========== PHẦN 13: GAME LOOP ==========
let lastTime = 0;

function gameLoop(currentTime = 0) {
  let deltaTime = Math.min(0.033, (currentTime - lastTime) / 1000);
  
  if (deltaTime > 0) {
    updateMovement(deltaTime);
    checkCoinCollection();
    
    // Cập nhật NPC (THÊM MỚI)
    if (npcSystem) npcSystem.update();
    
    draw();
  }
  
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

// ========== PHẦN 14: KHỞI TẠO GAME ==========
function init() {
  setupFirebase();
  setupInputs();
  setupNPC();      // THÊM MỚI
  setupJoystick(); // THÊM MỚI
  gameLoop();
}

// Start game
window.onload = init;
