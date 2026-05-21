class VirtualJoystick {
  constructor(containerId, thumbId, onMove) {
    this.container = document.getElementById(containerId);
    this.thumb = document.getElementById(thumbId);
    this.onMove = onMove;
    this.active = false;
    this.center = { x: 0, y: 0 };
    this.vector = { x: 0, y: 0 };
    this.radius = 50;
    this.maxDist = 35;
    
    this.initEvents();
  }
  
  initEvents() {
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.active = true;
      const rect = this.container.getBoundingClientRect();
      this.center = {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2
      };
      this.updateThumb(e.touches[0]);
    });
    
    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.active) this.updateThumb(e.touches[0]);
    });
    
    this.container.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.reset();
    });
    
    // Mouse support for debugging on PC
    this.container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.active = true;
      const rect = this.container.getBoundingClientRect();
      this.center = {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2
      };
      this.updateThumb(e);
    });
    
    window.addEventListener('mousemove', (e) => {
      if (this.active) this.updateThumb(e);
    });
    
    window.addEventListener('mouseup', () => this.reset());
  }
  
  updateThumb(pointer) {
    const dx = pointer.clientX - this.center.x;
    const dy = pointer.clientY - this.center.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let angle = Math.atan2(dy, dx);
    
    if (dist > this.maxDist) dist = this.maxDist;
    
    const moveX = Math.cos(angle) * dist;
    const moveY = Math.sin(angle) * dist;
    
    this.thumb.style.transform = `translate(${moveX}px, ${moveY}px)`;
    this.vector = {
      x: moveX / this.maxDist,
      y: moveY / this.maxDist
    };
    
    if (this.onMove) this.onMove(this.vector);
  }
  
  reset() {
    this.active = false;
    this.thumb.style.transform = `translate(0px, 0px)`;
    this.vector = { x: 0, y: 0 };
    if (this.onMove) this.onMove(this.vector);
  }
  
  getVector() {
    return this.vector;
  }
}
