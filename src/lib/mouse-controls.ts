/**
 * Mouse Controls for Fractal Canvas
 * Frame-rate independent with debounced rendering
 */

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  velocityX: number;
  velocityY: number;
}

export class MouseControls {
  private viewport: ViewportState;
  private targetViewport: ViewportState; // For tweening
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private animationFrameId: number | null = null;
  
  // Optimized for smooth feel regardless of render speed
  private friction = 0.92; // Momentum decay - lower = stops faster
  private zoomSpeed = 1.08; // Zoom per wheel tick (1.08 = 8% per tick)
  private minZoom = 0.1;
  private maxZoom = 1000;
  
  // Debouncing to prevent render during rapid input
  private lastEmitTime = 0;
  private emitDelay = 16; // ~60fps max emit rate (independent of actual render speed)
  private pendingEmit = false;
  
  private tweenProgress = 0;
  private isTweening = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private onViewportChange: (viewport: ViewportState) => void
  ) {
    this.viewport = {
      x: 0,
      y: 0,
      zoom: 1,
      velocityX: 0,
      velocityY: 0
    };
    this.targetViewport = { ...this.viewport };

    this.setupEventListeners();
    this.startInertialDecay();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Get world coordinates before zoom
    const worldX = (mouseX - this.canvas.width / 2) / this.viewport.zoom + this.viewport.x;
    const worldY = (mouseY - this.canvas.height / 2) / this.viewport.zoom + this.viewport.y;

    // Apply zoom (smaller steps for smoother feel)
    const direction = event.deltaY > 0 ? -1 : 1;
    const zoomFactor = direction > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
    
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.viewport.zoom * zoomFactor));
    
    // Only update if zoom changed significantly
    if (Math.abs(newZoom - this.viewport.zoom) > 0.0001) {
      this.viewport.zoom = newZoom;

      // Keep world point under cursor
      this.viewport.x = worldX - (mouseX - this.canvas.width / 2) / this.viewport.zoom;
      this.viewport.y = worldY - (mouseY - this.canvas.height / 2) / this.viewport.zoom;

      this.emitChangeDebounced();
    }
  }

  private onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastMouseX = event.clientX - rect.left;
    this.lastMouseY = event.clientY - rect.top;
    this.viewport.velocityX = 0;
    this.viewport.velocityY = 0;
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const deltaX = currentX - this.lastMouseX;
    const deltaY = currentY - this.lastMouseY;

    // Screen-relative movement scaled by zoom
    // At higher zoom, smaller screen movements = larger world movements (feels natural)
    const worldDeltaX = -deltaX / this.viewport.zoom;
    const worldDeltaY = -deltaY / this.viewport.zoom;

    this.viewport.x += worldDeltaX;
    this.viewport.y += worldDeltaY;

    // Store velocity for inertial decay (scaled down for smoothness)
    this.viewport.velocityX = worldDeltaX * 0.5;
    this.viewport.velocityY = worldDeltaY * 0.5;

    this.lastMouseX = currentX;
    this.lastMouseY = currentY;

    this.emitChangeDebounced();
  }

  private onMouseUp() {
    this.isDragging = false;
  }

  private onTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      const rect = this.canvas.getBoundingClientRect();
      const touch = event.touches[0];
      this.lastMouseX = touch.clientX - rect.left;
      this.lastMouseY = touch.clientY - rect.top;
      this.viewport.velocityX = 0;
      this.viewport.velocityY = 0;
    }
  }

  private onTouchMove(event: TouchEvent) {
    if (!this.isDragging || event.touches.length !== 1) return;

    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    const deltaX = currentX - this.lastMouseX;
    const deltaY = currentY - this.lastMouseY;

    const worldDeltaX = -deltaX / this.viewport.zoom;
    const worldDeltaY = -deltaY / this.viewport.zoom;

    this.viewport.x += worldDeltaX;
    this.viewport.y += worldDeltaY;

    this.viewport.velocityX = worldDeltaX * 0.5;
    this.viewport.velocityY = worldDeltaY * 0.5;

    this.lastMouseX = currentX;
    this.lastMouseY = currentY;

    this.emitChangeDebounced();
  }

  private onTouchEnd() {
    this.isDragging = false;
  }

  private startInertialDecay() {
    const animate = () => {
      // Update tweening if active
      this.updateTween();

      // Apply inertial decay
      const velocityMagnitude = Math.sqrt(
        this.viewport.velocityX ** 2 + this.viewport.velocityY ** 2
      );

      if (velocityMagnitude > 0.0001) {
        this.viewport.x += this.viewport.velocityX;
        this.viewport.y += this.viewport.velocityY;

        this.viewport.velocityX *= this.friction;
        this.viewport.velocityY *= this.friction;

        this.emitChangeDebounced();
      }

      // Handle pending emit
      if (this.pendingEmit) {
        const now = Date.now();
        if (now - this.lastEmitTime >= this.emitDelay) {
          this.emitChange();
          this.pendingEmit = false;
        }
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Debounced emit - only emits changes at max 60fps to prevent
   * overwhelming slow renderers
   */
  private emitChangeDebounced() {
    const now = Date.now();
    if (now - this.lastEmitTime >= this.emitDelay) {
      this.emitChange();
    } else {
      this.pendingEmit = true;
    }
  }

  private emitChange() {
    this.lastEmitTime = Date.now();
    this.onViewportChange(this.viewport);
  }

  getViewport(): Readonly<ViewportState> {
    return { ...this.viewport };
  }

  setViewport(viewport: Partial<ViewportState>, tween: boolean = true) {
    // When switching fractals, tween smoothly to new viewport
    if (tween && (viewport.x !== undefined || viewport.y !== undefined || viewport.zoom !== undefined)) {
      this.targetViewport = { ...this.viewport, ...viewport };
      this.isTweening = true;
      this.tweenProgress = 0;
    } else {
      this.viewport = { ...this.viewport, ...viewport };
      this.targetViewport = { ...this.viewport };
      this.isTweening = false;
      this.emitChange();
    }
  }

  private updateTween() {
    if (!this.isTweening) return;

    this.tweenProgress += 0.08; // 8% per frame = ~200ms duration
    if (this.tweenProgress >= 1) {
      this.tweenProgress = 1;
      this.isTweening = false;
    }

    // Easing: ease-out-cubic for smooth deceleration
    const t = this.tweenProgress;
    const easeOut = 1 - Math.pow(1 - t, 3);

    this.viewport.x = this.viewport.x + (this.targetViewport.x - this.viewport.x) * easeOut;
    this.viewport.y = this.viewport.y + (this.targetViewport.y - this.viewport.y) * easeOut;
    this.viewport.zoom = this.viewport.zoom + (this.targetViewport.zoom - this.viewport.zoom) * easeOut;

    this.emitChange();
  }

  reset() {
    this.viewport = {
      x: 0,
      y: 0,
      zoom: 1,
      velocityX: 0,
      velocityY: 0
    };
    this.targetViewport = { ...this.viewport };
    this.emitChange();
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.canvas.width / 2) / this.viewport.zoom + this.viewport.x,
      y: (screenY - this.canvas.height / 2) / this.viewport.zoom + this.viewport.y
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.viewport.x) * this.viewport.zoom + this.canvas.width / 2,
      y: (worldY - this.viewport.y) * this.viewport.zoom + this.canvas.height / 2
    };
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
