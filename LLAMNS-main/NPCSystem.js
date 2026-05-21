class NPCSystem {
  constructor(npcData, canvas, getPlayerPosition) {
    this.npc = npcData;
    this.canvas = canvas;
    this.getPlayerPosition = getPlayerPosition;
    this.currentDialogIndex = 0;
    this.isDialogOpen = false;
    this.interactionDistance = 65;
    this.onTalkCallback = null;
    
    this.initUI();
  }
  
  initUI() {
    this.modal = document.getElementById('npc-modal');
    this.dialogText = document.getElementById('npc-dialog-text');
    this.npcNameEl = document.getElementById('npc-name');
    this.nextBtn = document.getElementById('npc-next-btn');
    this.closeBtn = document.getElementById('npc-close-btn');
    this.progressSpan = document.getElementById('npc-progress');
    
    if (this.npcNameEl) this.npcNameEl.innerText = this.npc.name;
    
    if (this.nextBtn) this.nextBtn.onclick = () => this.nextDialog();
    if (this.closeBtn) this.closeBtn.onclick = () => this.closeDialog();
    
    const closeBtn = document.getElementById('close-npc');
    if (closeBtn) closeBtn.onclick = () => this.closeDialog();
  }
  
  setTalkCallback(callback) {
    this.onTalkCallback = callback;
  }
  
  showInteractButton(show) {
    const btn = document.getElementById('interact-btn');
    if (btn) btn.style.display = show ? 'block' : 'none';
  }
  
  startDialog() {
    this.currentDialogIndex = 0;
    this.isDialogOpen = true;
    if (this.modal) this.modal.style.display = 'block';
    this.updateDialog();
    this.showInteractButton(false);
    if (this.onTalkCallback) this.onTalkCallback();
  }
  
  updateDialog() {
    const dialogs = this.npc.dialogs;
    if (this.currentDialogIndex < dialogs.length) {
      if (this.dialogText) this.dialogText.innerText = dialogs[this.currentDialogIndex];
      if (this.progressSpan) this.progressSpan.innerText = this.currentDialogIndex + 1 + '/' + dialogs.length;
      if (this.nextBtn) {
        this.nextBtn.innerText = (this.currentDialogIndex === dialogs.length - 1) ? '🏁 Kết thúc' : '➡ Tiếp';
      }
    } else {
      this.closeDialog();
    }
  }
  
  nextDialog() {
    if (this.currentDialogIndex < this.npc.dialogs.length - 1) {
      this.currentDialogIndex++;
      this.updateDialog();
    } else {
      this.closeDialog();
    }
  }
  
  closeDialog() {
    this.isDialogOpen = false;
    if (this.modal) this.modal.style.display = 'none';
    this.currentDialogIndex = 0;
  }
  
  update() {
    if (!this.getPlayerPosition) return;
    const player = this.getPlayerPosition();
    if (!player) return;
    
    const dx = player.x - this.npc.x;
    const dy = player.y - this.npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < this.interactionDistance && !this.isDialogOpen) {
      this.showInteractButton(true);
      const talkBtn = document.getElementById('talk-btn');
      if (talkBtn && !talkBtn._bound) {
        talkBtn._bound = true;
        talkBtn.onclick = () => this.startDialog();
      }
    } else if (dist >= this.interactionDistance) {
      this.showInteractButton(false);
      if (this.isDialogOpen) this.closeDialog();
    }
  }
  
  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 0;
    
    // Vẽ vùng tương tác (mờ)
    ctx.beginPath();
    ctx.arc(this.npc.x, this.npc.y, this.interactionDistance, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 163, 115, 0.1)';
    ctx.fill();
    
    // Vẽ thân NPC
    ctx.beginPath();
    ctx.arc(this.npc.x, this.npc.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 163, 115, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Vẽ icon nón lá
    ctx.font = '36px Arial';
    ctx.fillStyle = '#4a2c1a';
    ctx.fillText('👒', this.npc.x - 18, this.npc.y + 12);
    
    // Vẽ tên NPC
    ctx.font = 'bold 12px "Source Sans Pro"';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3;
    ctx.fillText(this.npc.name, this.npc.x - 40, this.npc.y - 32);
    
    // Nếu đang trò chuyện, vẽ bong bóng
    if (this.isDialogOpen) {
      ctx.beginPath();
      ctx.moveTo(this.npc.x, this.npc.y - 18);
      ctx.lineTo(this.npc.x - 8, this.npc.y - 28);
      ctx.lineTo(this.npc.x + 8, this.npc.y - 28);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
    
    ctx.restore();
  }
}
