class NPCSystem {
  constructor(npcData, canvas, playerGetter) {
    this.npc = npcData; // {id, x, y, name, dialogs: ["line1","line2",...], avatar}
    this.canvas = canvas;
    this.getPlayerPosition = playerGetter;
    this.currentDialogIndex = 0;
    this.isDialogOpen = false;
    this.interactionDistance = 50; // pixels
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
    
    this.nextBtn.onclick = () => this.nextDialog();
    this.closeBtn.onclick = () => this.closeDialog();
    document.getElementById('close-npc').onclick = () => this.closeDialog();
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
    this.modal.style.display = 'block';
    this.updateDialog();
    this.showInteractButton(false);
    if (this.onTalkCallback) this.onTalkCallback();
  }
  
  updateDialog() {
    const dialogs = this.npc.dialogs;
    if (this.currentDialogIndex < dialogs.length) {
      this.dialogText.innerText = dialogs[this.currentDialogIndex];
      this.progressSpan.innerText = `${this.currentDialogIndex + 1}/${dialogs.length}`;
      this.nextBtn.innerText = this.currentDialogIndex === dialogs.length - 1 ? '🏁 Kết thúc' : '➡ Tiếp';
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
    this.modal.style.display = 'none';
    this.currentDialogIndex = 0;
  }
  
  update() {
    if (!this.getPlayerPosition) return;
    const player = this.getPlayerPosition();
    if (!player) return;
    
    // Check distance to NPC
    const dx = player.x - this.npc.x;
    const dy = player.y - this.npc.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < this.interactionDistance && !this.isDialogOpen) {
      this.showInteractButton(true);
      // Bind talk button
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
    // Draw NPC on map
    ctx.save();
    ctx.shadowBlur = 0;
    // Draw circle indicator
    ctx.beginPath();
    ctx.arc(this.npc.x, this.npc.y, 25, 0, 2*Math.PI);
    ctx.fillStyle = 'rgba(212, 163, 115, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw icon (if avatar image exists)
    if (this.npc.avatarImg) {
      ctx.drawImage(this.npc.avatarImg, this.npc.x-20, this.npc.y-20, 40, 40);
    } else {
      ctx.font = "30px Arial";
      ctx.fillStyle = "#4a2c1a";
      ctx.fillText("👒", this.npc.x-15, this.npc.y+10);
    }
    
    // Draw name
    ctx.font = "bold 12px 'Source Sans Pro'";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2;
    ctx.fillText(this.npc.name, this.npc.x-25, this.npc.y-25);
    ctx.restore();
  }
}
