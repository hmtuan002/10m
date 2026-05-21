// ==================== CẤU HÌNH GAME ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Kích thước canvas full màn hình
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Camera focus vào nhân vật
let cameraX = 0, cameraY = 0;

// Kích thước map (giả sử map 3000x3000 - bạn có thể điều chỉnh theo map thực tế)
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 4000;

// Nhân vật chính
let player = {
  x: MAP_WIDTH / 2,
  y: MAP_HEIGHT / 2,
  radius: 20,
  speed: 5,
  skin: 'default',
  coins: 0,
  name: 'Player'
};

// Danh sách NPC (gồm merchant bán skin và bà lão nói về nón lá)
const npcs = [
  { // NPC bán skin
    id: 'merchant',
    name: 'Thương Nhân',
    x: 1800,
    y: 2100,
    radius: 28,
    type: 'shop',
    dialog: null,
    avatar: '🛒'
  },
  { // NPC mới: Bà lão nói về nón lá Việt Nam
    id: 'nonla_npc',
    name: 'Bà Lão Làng',
    x: 2800,
    y: 1500,
    radius: 28,
    type: 'story',
    avatar: '🧕',
    // Nội dung hội thoại nhiều trang (giới thiệu nón lá)
    dialogPages: [
      "Chào con! Bà thấy con là người có duyên với văn hóa Việt Nam đấy.",
      "Con có biết chiếc nón lá không? Nó là biểu tượng của người phụ nữ Việt Nam từ bao đời nay.",
      "Nón lá được làm từ lá cọ, lá dừa, chuốt từng sợi rất công phu. Dưới nắng mưa miền Tây, nón che chở cho mẹ, cho chị.",
      "Hình ảnh nón lá nghiêng che mưa nắng đã đi vào thơ ca nhạc họa. Nón bài thơ ở Huế còn lồng cả vần thơ vào bên trong.",
      "Ngày nay, nón lá vẫn được giữ gìn như một nét đẹp tinh tế. Hãy luôn tự hào về văn hóa Việt Nam con nhé!",
      "Bà cảm ơn con đã lắng nghe. Chúc con luôn vui và giữ gìn bản sắc dân tộc."
    ]
  }
];

// Các skin có sẵn (giống cấu trúc cũ)
const availableSkins = [
  { id: 'default', name: 'Nhà Nông', price: 0, emoji: '👨‍🌾' },
  { id: 'warrior', name: 'Dũng Sĩ', price: 100, emoji: '⚔️' },
  { id: 'mage', name: 'Pháp Sư', price: 150, emoji: '🔮' },
  { id: 'vietnamese', name: 'Áo Dài', price: 200, emoji: '🇻🇳' }
];

// Biến điều khiển di chuyển (phím + WASD)
const keysPressed = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  w: false, s: false, a: false, d: false
};

// Joystick ảo
let joystickActive = false;
let joystickVector = { x: 0, y: 0 };
const joystickContainer = document.getElementById('joystickContainer');
const joystickThumb = document.getElementById('joystickThumb');
let joystickCenter = { x: 0, y: 0 };
let joystickRadius = 50;

// Modal shop
const modal = document.getElementById('merchant-modal');
const closeModalBtn = document.getElementById('close-modal');
const skinShopList = document.getElementById('skin-shop-list');
const playerCoinsSpan = document.getElementById('player-coins');
const playerNameInput = document.getElementById('player-name');

// Dialog NPC (mới)
const dialogModal = document.getElementById('npc-dialog-modal');
const dialogText = document.getElementById('npc-dialog-text');
const dialogNextBtn = document.getElementById('dialog-next-btn');
const dialogCloseBtn = document.getElementById('dialog-close-btn');
let currentNPC = null;         // NPC đang trò chuyện
let currentPageIndex = 0;      // trang hiện tại

// ==================== HÀM HỖ TRỢ ====================
function updateCoinUI() {
  playerCoinsSpan.innerText = player.coins;
}

function showMerchantModal() {
  modal.style.display = 'flex';
  renderSkinShop();
}

function closeMerchantModal() {
  modal.style.display = 'none';
}

// Giao diện shop skin
function renderSkinShop() {
  skinShopList.innerHTML = '';
  availableSkins.forEach(skin => {
    const card = document.createElement('div');
    card.className = 'skin-card';
    card.innerHTML = `
      <div style="font-size:48px;">${skin.emoji}</div>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-price">💰 ${skin.price}</div>
    `;
    card.onclick = () => buySkin(skin);
    skinShopList.appendChild(card);
  });
}

function buySkin(skin) {
  if (player.coins >= skin.price) {
    player.coins -= skin.price;
    player.skin = skin.id;
    updateCoinUI();
    const msg = document.getElementById('merchant-message');
    msg.innerText = `✨ Mua thành công skin ${skin.name}! ✨`;
    setTimeout(() => {
      msg.innerText = 'Chào mừng! Dùng xu để mua skin nhé!';
    }, 2000);
    // Lưu lên firebase nếu muốn (tùy)
  } else {
    alert('Không đủ xu! Hãy nhặt thêm xu trên bản đồ.');
  }
}

// ==================== HỘI THOẠI NPC NÓN LÁ ====================
function openNPCDialog(npc) {
  if (npc.type !== 'story') return;
  currentNPC = npc;
  currentPageIndex = 0;
  dialogModal.style.display = 'block';
  updateDialogContent();
}

function updateDialogContent() {
  if (!currentNPC || !currentNPC.dialogPages) return;
  if (currentPageIndex < currentNPC.dialogPages.length) {
    dialogText.innerText = currentNPC.dialogPages[currentPageIndex];
  } else {
    // Hết hội thoại => tự đóng
    closeDialog();
  }
}

function nextDialogPage() {
  if (currentNPC && currentNPC.dialogPages) {
    if (currentPageIndex + 1 < currentNPC.dialogPages.length) {
      currentPageIndex++;
      updateDialogContent();
    } else {
      closeDialog();
    }
  } else {
    closeDialog();
  }
}

function closeDialog() {
  dialogModal.style.display = 'none';
  currentNPC = null;
  currentPageIndex = 0;
}

// ==================== DI CHUYỂN (WASD + ARROW + JOYSTICK) ====================
function updateMovement() {
  let moveX = 0, moveY = 0;
  
  // Xử lý từ bàn phím (WASD + mũi tên)
  if (keysPressed.ArrowUp || keysPressed.w) moveY -= 1;
  if (keysPressed.ArrowDown || keysPressed.s) moveY += 1;
  if (keysPressed.ArrowLeft || keysPressed.a) moveX -= 1;
  if (keysPressed.ArrowRight || keysPressed.d) moveX += 1;
  
  // Xử lý từ joystick (mobile)
  if (joystickActive && (Math.abs(joystickVector.x) > 0.1 || Math.abs(joystickVector.y) > 0.1)) {
    moveX += joystickVector.x;
    moveY += joystickVector.y;
  }
  
  // Chuẩn hóa vector
  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    moveX /= len;
    moveY /= len;
  }
  
  // Cập nhật vị trí
  let newX = player.x + moveX * player.speed;
  let newY = player.y + moveY * player.speed;
  
  // Giới hạn trong map
  player.x = Math.min(Math.max(newX, player.radius + 10), MAP_WIDTH - player.radius - 10);
  player.y = Math.min(Math.max(newY, player.radius + 10), MAP_HEIGHT - player.radius - 10);
}

// ==================== KIỂM TRA TƯƠNG TÁC NPC ====================
function checkNPCProximity() {
  for (let npc of npcs) {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist < player.radius + npc.radius + 15) { // trong vùng tương tác
      if (npc.type === 'shop') {
        // Hiện modal bán skin
        showMerchantModal();
      } else if (npc.type === 'story' && (!currentNPC || dialogModal.style.display !== 'block')) {
        // Nếu chưa mở dialog thì mở
        openNPCDialog(npc);
      }
      break; // chỉ tương tác một NPC mỗi frame
    }
  }
}

// ==================== VẼ GAME (Map, NPC, Player) ====================
// Lưu ý: Hàm vẽ này chỉ là demo, nếu bạn có map ảnh thì thay bằng drawImage
function drawBackground() {
  // Nền xanh mô phỏng cỏ (giả lập map)
  ctx.fillStyle = '#3c9e3c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Vẽ lưới ô đơn giản
  ctx.strokeStyle = '#2d6a2d';
  ctx.lineWidth = 1;
  const step = 60;
  for (let i = 0; i < MAP_WIDTH; i += step) {
    ctx.beginPath();
    ctx.moveTo(i - cameraX, 0);
    ctx.lineTo(i - cameraX, canvasHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i - cameraY);
    ctx.lineTo(canvasWidth, i - cameraY);
    ctx.stroke();
  }
}

function drawNPCs() {
  npcs.forEach(npc => {
    const screenX = npc.x - cameraX;
    const screenY = npc.y - cameraY;
    if (screenX + 30 > 0 && screenX - 30 < canvasWidth && screenY + 30 > 0 && screenY - 30 < canvasHeight) {
      // Vẽ circle NPC
      ctx.beginPath();
      ctx.arc(screenX, screenY, npc.radius, 0, Math.PI*2);
      ctx.fillStyle = '#e0aa7a';
      ctx.fill();
      ctx.strokeStyle = '#b97f44';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Emoji hoặc icon
      ctx.font = `${npc.radius + 8}px "Segoe UI Emoji"`;
      ctx.fillStyle = '#2c1e12';
      ctx.fillText(npc.avatar || '🧑', screenX-18, screenY+12);
      // Tên
      ctx.font = 'bold 14px "Source Sans Pro"';
      ctx.fillStyle = 'white';
      ctx.shadowBlur = 0;
      ctx.fillText(npc.name, screenX-25, screenY-15);
      
      // Nếu trong phạm vi tương tác thì vẽ icon nói chuyện
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      if (Math.hypot(dx, dy) < player.radius + npc.radius + 15) {
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#ffdd99';
        ctx.fillText('💬', screenX-15, screenY-28);
      }
    }
  });
}

function drawPlayer() {
  const screenX = player.x - cameraX;
  const screenY = player.y - cameraY;
  ctx.beginPath();
  ctx.arc(screenX, screenY, player.radius, 0, Math.PI*2);
  const skinEmoji = availableSkins.find(s => s.id === player.skin)?.emoji || '👨‍🌾';
  ctx.fillStyle = '#ffd966';
  ctx.fill();
  ctx.strokeStyle = '#b97f2e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `${player.radius + 6}px "Segoe UI Emoji"`;
  ctx.fillStyle = '#362812';
  ctx.fillText(skinEmoji, screenX-16, screenY+12);
  ctx.font = 'bold 14px "Source Sans Pro"';
  ctx.fillStyle = '#f9f3cf';
  ctx.fillText(player.name, screenX-25, screenY-18);
}

function drawCoins() {
  // Hàm giả để nhặt xu, giữ nguyên cấu trúc có sẵn (bạn có thể bổ sung item coin thật)
  // Ở đây để demo đơn giản, mỗi giây cộng 1 xu (giả lập)
}

// ==================== CẬP NHẬT CAMERA ====================
function updateCamera() {
  cameraX = player.x - canvasWidth/2;
  cameraY = player.y - canvasHeight/2;
  cameraX = Math.min(Math.max(cameraX, 0), MAP_WIDTH - canvasWidth);
  cameraY = Math.min(Math.max(cameraY, 0), MAP_HEIGHT - canvasHeight);
}

// ==================== GAME LOOP ====================
function gameLoop() {
  updateMovement();
  updateCamera();
  checkNPCProximity();
  
  // Xóa canvas và vẽ lại
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawBackground();
  drawNPCs();
  drawPlayer();
  
  requestAnimationFrame(gameLoop);
}

// ==================== KHỞI TẠO SỰ KIỆN BÀN PHÍM ====================
function initKeyboard() {
  const handleKeyDown = (e) => {
    const key = e.key;
    if (keysPressed.hasOwnProperty(key)) {
      keysPressed[key] = true;
      e.preventDefault();
    }
    // Các phím WASD viết thường
    if (key === 'w') keysPressed.w = true;
    if (key === 's') keysPressed.s = true;
    if (key === 'a') keysPressed.a = true;
    if (key === 'd') keysPressed.d = true;
  };
  
  const handleKeyUp = (e) => {
    const key = e.key;
    if (keysPressed.hasOwnProperty(key)) keysPressed[key] = false;
    if (key === 'w') keysPressed.w = false;
    if (key === 's') keysPressed.s = false;
    if (key === 'a') keysPressed.a = false;
    if (key === 'd') keysPressed.d = false;
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

// ==================== JOYSTICK ẢO ====================
function initJoystick() {
  const container = joystickContainer;
  const thumb = joystickThumb;
  const rect = container.getBoundingClientRect();
  joystickCenter.x = rect.left + rect.width/2;
  joystickCenter.y = rect.top + rect.height/2;
  joystickRadius = rect.width/2;
  
  const handleMove = (clientX, clientY) => {
    if (!joystickActive) return;
    let dx = clientX - joystickCenter.x;
    let dy = clientY - joystickCenter.y;
    let distance = Math.min(joystickRadius, Math.hypot(dx, dy));
    if (distance > 0) {
      const angle = Math.atan2(dy, dx);
      const limitedX = Math.cos(angle) * distance;
      const limitedY = Math.sin(angle) * distance;
      thumb.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
      joystickVector.x = limitedX / joystickRadius;
      joystickVector.y = limitedY / joystickRadius;
    } else {
      thumb.style.transform = 'translate(-50%, -50%)';
      joystickVector = { x: 0, y: 0 };
    }
  };
  
  const onStart = (e) => {
    e.preventDefault();
    joystickActive = true;
    const point = e.touches ? e.touches[0] : e;
    handleMove(point.clientX, point.clientY);
  };
  
  const onMove = (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    handleMove(point.clientX, point.clientY);
  };
  
  const onEnd = () => {
    joystickActive = false;
    joystickVector = { x: 0, y: 0 };
    thumb.style.transform = 'translate(-50%, -50%)';
  };
  
  container.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  container.addEventListener('touchstart', onStart);
  window.addEventListener('touchmove', onMove);
  window.addEventListener('touchend', onEnd);
  
  window.addEventListener('resize', () => {
    const newRect = container.getBoundingClientRect();
    joystickCenter.x = newRect.left + newRect.width/2;
    joystickCenter.y = newRect.top + newRect.height/2;
    joystickRadius = newRect.width/2;
  });
}

// ==================== KHỞI CHẠY GAME ====================
window.addEventListener('load', () => {
  // Cập nhật kích thước canvas khi resize
  function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    updateCamera();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  initKeyboard();
  initJoystick();
  
  // UI events
  document.getElementById('change-skin').addEventListener('click', () => showMerchantModal());
  closeModalBtn.addEventListener('click', closeMerchantModal);
  window.addEventListener('click', (e) => { if (e.target === modal) closeMerchantModal(); });
  dialogNextBtn.addEventListener('click', nextDialogPage);
  dialogCloseBtn.addEventListener('click', closeDialog);
  
  // Tên người chơi
  playerNameInput.value = player.name;
  playerNameInput.addEventListener('change', (e) => { player.name = e.target.value || 'Player'; });
  
  // Demo: random thêm xu mỗi giây để test mua skin
  setInterval(() => {
    player.coins += 5;
    updateCoinUI();
  }, 3000);
  
  updateCoinUI();
  gameLoop();
});

// KeyPressListener tương thích nếu có dùng (không xóa)
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
