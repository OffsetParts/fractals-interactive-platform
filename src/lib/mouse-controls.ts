/**
 * Mouse Controls for Fractal Canvas
 * Handles wheel zoom and drag-pan with inertial decay
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
  private friction = 0.90; // Reduced from 0.95 for slower pan momentum
  private zoomSpeed = 0.5; // Reduced from 1.05 for gentler zoom
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
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), false);
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
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

    // Apply zoom (inverted for natural scrolling direction)
    const zoomFactor = event.deltaY > 0 ? 1 / this.zoomSpeed : this.zoomSpeed;
    this.viewport.zoom *= zoomFactor;

    // Keep world point under cursor
    this.viewport.x = worldX - (mouseX - this.canvas.width / 2) / this.viewport.zoom;
    this.viewport.y = worldY - (mouseY - this.canvas.height / 2) / this.viewport.zoom;

    this.emitChange();
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

    // Convert screen space delta to world space
    const worldDeltaX = -deltaX / this.viewport.zoom;
    const worldDeltaY = -deltaY / this.viewport.zoom;

    this.viewport.x += worldDeltaX;
    this.viewport.y += worldDeltaY;

    // Store velocity for inertial decay
    this.viewport.velocityX = worldDeltaX;
    this.viewport.velocityY = worldDeltaY;

    this.lastMouseX = currentX;
    this.lastMouseY = currentY;

    this.emitChange();
  }

  private onMouseUp() {
    this.isDragging = false;
  }

  private onTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
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

    this.viewport.velocityX = worldDeltaX;
    this.viewport.velocityY = worldDeltaY;

    this.lastMouseX = currentX;
    this.lastMouseY = currentY;

    this.emitChange();
  }

  private onTouchEnd() {
    this.isDragging = false;
  }

  private startInertialDecay() {
    const animate = () => {
      // Update tweening if active
      this.updateTween();

      if (Math.abs(this.viewport.velocityX) > 0.0001 || Math.abs(this.viewport.velocityY) > 0.0001) {
        this.viewport.x += this.viewport.velocityX;
        this.viewport.y += this.viewport.velocityY;

        this.viewport.velocityX *= this.friction;
        this.viewport.velocityY *= this.friction;

        this.emitChange();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private emitChange() {
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
