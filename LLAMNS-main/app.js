// ========== app.js - GAME ĐẦY ĐỦ NHÂN VẬT, COIN, MULTIPLAYER, NPC, JOYSTICK ==========

// Khởi tạo canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1400;
canvas.height = 800;

// ========== BIẾN GAME ==========
let playerId = null;
let playerName = localStorage.getItem('playerName') || 'Nhà Thám Hiểm';
let playerCoins = 0;
let currentSkin = 'default';
let ownedSkins = ['default'];

// Vị trí người chơi
let playerX = canvas.width / 2;
let playerY = canvas.height / 2;
let targetX = playerX;
let targetY = playerY;

// Tốc độ di chuyển
const MOVE_SPEED = 300;

// Firebase
let dbRef = null;
let playersRef = null;
let coinsRef = null;

// Dữ liệu multiplayer
let otherPlayers = new Map();
let coins = new Map();

// ========== DANH SÁCH SKIN ==========
const skins = [
    { id: 'default', name: '🐱 Mặc Định', price: 0, emoji: '🐱', color: '#ffccaa' },
    { id: 'ninja', name: '🥷 Ninja', price: 50, emoji: '🥷', color: '#2c2c2c' },
    { id: 'wizard', name: '🧙 Phù Thủy', price: 100, emoji: '🧙', color: '#6a0dad' },
    { id: 'vietnam_hat', name: '👒 Nón Lá Việt Nam', price: 80, emoji: '👒', color: '#d4a373' },
    { id: 'samurai', name: '⚔️ Samurai', price: 120, emoji: '⚔️', color: '#8b0000' },
    { id: 'princess', name: '👸 Công Chúa', price: 150, emoji: '👸', color: '#ff69b4' }
];

// ========== NPC BÀ LÃO NÓN LÁ ==========
const hatNpc = {
    id: 'hat_npc',
    x: 1050,
    y: 580,
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

// ========== JOYSTICK VÀ ĐIỀU KHIỂN ==========
let joystick = null;
let joystickVector = { x: 0, y: 0 };

// Hỗ trợ phím mũi tên và WASD
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false
};

// ========== KHỞI TẠO FIREBASE ==========
function setupFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyAq52d5zrc5rN6UFflwb22bJD9GSjdS0ts",
        authDomain: "vvss-b7a49.firebaseapp.com",
        databaseURL: "https://vvss-b7a49-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "vvss-b7a49",
        storageBucket: "vvss-b7a49.firebasestorage.app",
        messagingSenderId: "562837285603",
        appId: "1:562837285603:web:e75d7a983e1ef644c9b3d6",
        measurementId: "G-BRSGSK6MSM"
    };
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    firebase.auth().signInAnonymously().catch(console.error);
    
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            playerId = user.uid;
            console.log('Đăng nhập thành công:', playerId);
            
            dbRef = firebase.database().ref();
            playersRef = dbRef.child('players');
            coinsRef = dbRef.child('coins');
            
            // Lưu thông tin người chơi
            playersRef.child(playerId).set({
                name: playerName,
                x: playerX,
                y: playerY,
                skin: currentSkin,
                coins: playerCoins,
                ownedSkins: ownedSkins,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Load coins
            loadCoins();
            
            // Lắng nghe người chơi khác
            playersRef.on('child_added', (data) => {
                if (data.key !== playerId) {
                    otherPlayers.set(data.key, data.val());
                }
            });
            
            playersRef.on('child_changed', (data) => {
                if (data.key !== playerId) {
                    otherPlayers.set(data.key, data.val());
                }
            });
            
            playersRef.on('child_removed', (data) => {
                otherPlayers.delete(data.key);
            });
            
            // Cập nhật vị trí định kỳ
            setInterval(updateServerPosition, 50);
            
            // Tạo coin nếu chưa có
            setTimeout(() => {
                if (coins.size === 0) generateCoins();
            }, 1000);
        }
    });
}

function updateServerPosition() {
    if (!playerId || !playersRef) return;
    playersRef.child(playerId).update({
        x: playerX,
        y: playerY,
        name: playerName,
        skin: currentSkin,
        coins: playerCoins,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

function loadCoins() {
    coinsRef.on('child_added', (snap) => {
        coins.set(snap.key, snap.val());
    });
    coinsRef.on('child_changed', (snap) => {
        coins.set(snap.key, snap.val());
    });
    coinsRef.on('child_removed', (snap) => {
        coins.delete(snap.key);
    });
}

function generateCoins() {
    for (let i = 0; i < 35; i++) {
        const coinId = 'coin_' + Date.now() + '_' + i + '_' + Math.random();
        const coin = {
            x: 60 + Math.random() * (canvas.width - 120),
            y: 60 + Math.random() * (canvas.height - 120),
            value: 1
        };
        coinsRef.child(coinId).set(coin);
    }
    
    // Tái tạo coin định kỳ
    setInterval(() => {
        if (coins.size < 20) {
            const coinId = 'coin_' + Date.now() + '_' + Math.random();
            const coin = {
                x: 60 + Math.random() * (canvas.width - 120),
                y: 60 + Math.random() * (canvas.height - 120),
                value: 1
            };
            coinsRef.child(coinId).set(coin);
        }
    }, 30000);
}

// ========== SETUP INPUT ==========
function setupInputs() {
    // Keyboard - mũi tên và WASD
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
    
    // Click chuột di chuyển
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
            updateServerPosition();
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

// ========== SKIN SHOP ==========
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
            <div style="font-size: 50px;">${skin.emoji}</div>
            <div style="font-weight: bold; margin: 5px 0;">${skin.name}</div>
            <div style="color: #ffd700;">💰 ${skin.price}</div>
            <button 
                ${ownedSkins.includes(skin.id) ? 'disabled' : ''}
                onclick="window.buySkin('${skin.id}', ${skin.price})"
            >
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
        updateCoinDisplay();
        alert('🎉 Mua thành công ' + skins.find(s => s.id === skinId).name + '!');
    } else {
        alert('💰 Không đủ xu! Cần ' + price + ' xu. Bạn có ' + playerCoins + ' xu.');
    }
};

function changeSkin(skinId) {
    if (ownedSkins.includes(skinId)) {
        currentSkin = skinId;
        updateServerPosition();
        alert('Đã đổi sang ' + skins.find(s => s.id === skinId).name);
    } else {
        alert('Bạn chưa sở hữu skin này!');
    }
}

// Click chuột phải đổi skin nhanh
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (ownedSkins.length > 1) {
        const currentIndex = ownedSkins.indexOf(currentSkin);
        const nextIndex = (currentIndex + 1) % ownedSkins.length;
        changeSkin(ownedSkins[nextIndex]);
    }
});

function updateCoinDisplay() {
    const coinDisplay = document.getElementById('player-coins');
    if (coinDisplay) {
        coinDisplay.innerText = playerCoins;
        coinDisplay.classList.add('pop');
        setTimeout(() => coinDisplay.classList.remove('pop'), 300);
    }
}

// ========== SETUP NPC VÀ JOYSTICK ==========
function setupNPC() {
    npcSystem = new NPCSystem(hatNpc, canvas, () => ({ x: playerX, y: playerY }));
}

function setupJoystick() {
    if (window.innerWidth <= 768) {
        joystick = new VirtualJoystick('joystickContainer', 'joystickThumb', (vec) => {
            joystickVector = vec;
        });
    }
}

// ========== DI CHUYỂN ==========
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
    
    // Di chuyển
    if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        moveX /= len;
        moveY /= len;
        playerX += moveX * MOVE_SPEED * deltaTime;
        playerY += moveY * MOVE_SPEED * deltaTime;
        targetX = playerX;
        targetY = playerY;
    } else {
        // Click chuột
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
    playerX = Math.min(Math.max(35, playerX), canvas.width - 35);
    playerY = Math.min(Math.max(35, playerY), canvas.height - 35);
    targetX = Math.min(Math.max(35, targetX), canvas.width - 35);
    targetY = Math.min(Math.max(35, targetY), canvas.height - 35);
}

// ========== NHẶT COIN ==========
function checkCoinCollection() {
    for (let [id, coin] of coins) {
        const dx = playerX - coin.x;
        const dy = playerY - coin.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 35) {
            playerCoins += (coin.value || 1);
            updateCoinDisplay();
            coinsRef.child(id).remove();
            break;
        }
    }
}

// ========== RENDER GAME ==========
function drawBackground() {
    // Gradient nền
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#5a9e4e');
    grad.addColorStop(0.5, '#4a8e3e');
    grad.addColorStop(1, '#3b6e2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cỏ
    ctx.fillStyle = '#6aae5a';
    for (let i = 0; i < 400; i++) {
        ctx.beginPath();
        ctx.arc((i * 131) % canvas.width, (i * 253) % canvas.height, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Hoa
    ctx.fillStyle = '#ffeb3b';
    for (let i = 0; i < 150; i++) {
        ctx.beginPath();
        ctx.arc((i * 97) % canvas.width, (i * 179) % canvas.height, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCoins() {
    for (let coin of coins.values()) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffd700';
        ctx.font = '34px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('🪙', coin.x - 17, coin.y - 17);
        
        // Hiệu ứng lấp lánh
        const time = Date.now() / 400;
        const sparkle = Math.sin(time + coin.x) * 0.5 + 0.5;
        ctx.globalAlpha = sparkle * 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('✨', coin.x - 8, coin.y - 28);
        ctx.restore();
    }
}

function drawOtherPlayers() {
    for (let [id, player] of otherPlayers) {
        if (player.x && player.y) {
            const skinData = skins.find(s => s.id === player.skin) || skins[0];
            ctx.font = '42px Arial';
            ctx.fillStyle = '#ffccaa';
            ctx.fillText(skinData.emoji, player.x - 21, player.y - 21);
            ctx.font = 'bold 11px "Source Sans Pro"';
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 2;
            ctx.fillText(player.name || '???', player.x - 28, player.y - 38);
        }
    }
}

function drawPlayer() {
    const skinData = skins.find(s => s.id === currentSkin) || skins[0];
    
    // Bóng
    ctx.beginPath();
    ctx.arc(playerX, playerY + 6, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    
    // Nhân vật
    ctx.font = '48px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(skinData.emoji, playerX - 24, playerY - 24);
    
    // Tên
    ctx.font = 'bold 12px "Source Sans Pro"';
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 3;
    ctx.fillText(playerName, playerX - 28, playerY - 38);
    
    // Viền vàng
    ctx.beginPath();
    ctx.arc(playerX, playerY, 32, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawUI() {
    ctx.font = '10px "Source Sans Pro"';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('💡 Click chuột phải để đổi skin nhanh', 12, canvas.height - 12);
    ctx.fillText('🖱️ Click chuột trái để di chuyển', 12, canvas.height - 26);
}

function draw() {
    drawBackground();
    drawCoins();
    drawOtherPlayers();
    
    // Vẽ NPC
    if (npcSystem) {
        npcSystem.draw(ctx);
    }
    
    drawPlayer();
    drawUI();
}

// ========== GAME LOOP ==========
let lastTime = 0;

function gameLoop(currentTime = 0) {
    let deltaTime = Math.min(0.033, (currentTime - lastTime) / 1000);
    
    if (deltaTime > 0) {
        updateMovement(deltaTime);
        checkCoinCollection();
        
        // Cập nhật NPC
        if (npcSystem) {
            npcSystem.update();
        }
        
        draw();
    }
    
    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
}

// ========== KHỞI TẠO GAME ==========
function init() {
    console.log('Khởi tạo game...');
    setupFirebase();
    setupInputs();
    setupNPC();
    setupJoystick();
    gameLoop();
}

// Khởi động game
window.onload = init;
