class CameraSystem {
    constructor(ctx, gameWidth, gameHeight, eventEmitter = null) {
        if (!ctx) {
            throw new Error("CameraSystem requires a rendering context (ctx).");
        }
        this.ctx = ctx;
        this.gameWidth = gameWidth; // Width of the canvas/viewport
        this.gameHeight = gameHeight; // Height of the canvas/viewport
        this.eventEmitter = eventEmitter; // Optional: for listening to input events

        this.x = 0; // Camera's top-left position in world coordinates
        this.y = 0;
        this.zoom = 1.0; // Zoom level

        this.minZoom = 0.5; // Minimum zoom level
        this.maxZoom = 3.0; // Maximum zoom level
        this.zoomStep = 0.1;

        // Panning properties
        this.isPanning = false;
        this.lastPanPosition = { x: 0, y: 0 };
        this.panSpeed = 1; // Multiplier for keyboard pan speed

        // Limits for camera movement (world boundaries)
        // These should be set based on the map size
        this.worldBounds = { minX: 0, minY: 0, maxX: 1600, maxY: 1200 }; // Example values

        if (this.eventEmitter) {
            this._initEventListeners();
        }
        console.log("CameraSystem initialized.");
    }

    _initEventListeners() {
        // Listen for mouse events for panning and zooming
        // Assuming InputSystem emits 'mousedown', 'mousemove', 'mouseup', 'wheel'
        // And that mouse positions are canvas-relative from InputSystem
        
        // Zooming with mouse wheel
        this.eventEmitter.on('wheel', (data) => {
            // data contains { deltaY, canvasX, canvasY, worldX, worldY }
            const zoomFactor = data.deltaY > 0 ? (1 - this.zoomStep) : (1 + this.zoomStep);
            this.zoomAtPoint(data.canvasX, data.canvasY, zoomFactor);
        });

        // Panning with mouse drag (middle mouse button or specific conditions)
        // TD-PLAN: "przesuwanie widoku poprzez przeciąganie myszą (aktywne tylko, gdy gracz nie jest w trybie umieszczania wieży)"
        // This logic (checking tower placement mode) will likely be managed by the game's main logic or InputSystem state
        this.eventEmitter.on('mousedown', (data) => {
            // Example: Pan with middle mouse button (button == 1)
            // Or, if a global state `game.isPlacingTower` is false
            // For now, let's assume middle mouse button panning
            if (data.button === 1) { // Middle mouse button
                this.isPanning = true;
                this.lastPanPosition.x = data.canvasX;
                this.lastPanPosition.y = data.canvasY;
            }
        });

        this.eventEmitter.on('mousemove', (data) => {
            if (this.isPanning) {
                const dx = (data.canvasX - this.lastPanPosition.x) / this.zoom;
                const dy = (data.canvasY - this.lastPanPosition.y) / this.zoom;
                this.move(-dx, -dy); // Move camera in opposite direction of mouse drag
                this.lastPanPosition.x = data.canvasX;
                this.lastPanPosition.y = data.canvasY;
            }
        });

        this.eventEmitter.on('mouseup', (data) => {
            if (data.button === 1 && this.isPanning) {
                this.isPanning = false;
            }
        });
        
        // Keyboard panning (TD-PLAN: arrow keys)
        // These would be handled in the game's update loop by checking InputSystem.isKeyPressed
        // or by listening to specific keydown events if InputSystem emits them.
        // For example, if InputSystem emits 'keydown:ArrowUp', 'keydown:ArrowDown', etc.
        // this.eventEmitter.on('keydown:ArrowUp', () => this.move(0, -10 * this.panSpeed / this.zoom));
        // this.eventEmitter.on('keydown:ArrowDown', () => this.move(0, 10 * this.panSpeed / this.zoom));
        // this.eventEmitter.on('keydown:ArrowLeft', () => this.move(-10 * this.panSpeed / this.zoom, 0));
        // this.eventEmitter.on('keydown:ArrowRight', () => this.move(10 * this.panSpeed / this.zoom, 0));
    }
    
    // Call this method in the main game loop to handle continuous keyboard panning
    updateFromKeyboard(inputSystem, dt) {
        if (!inputSystem) return;
        
        const moveSpeed = 150 * this.panSpeed / this.zoom * dt; // pixels per second scaled by dt

        if (inputSystem.isKeyPressed('ArrowUp')) this.move(0, -moveSpeed);
        if (inputSystem.isKeyPressed('ArrowDown')) this.move(0, moveSpeed);
        if (inputSystem.isKeyPressed('ArrowLeft')) this.move(-moveSpeed, 0);
        if (inputSystem.isKeyPressed('ArrowRight')) this.move(moveSpeed, 0);
    }


    setWorldBounds(minX, minY, maxX, maxY) {
        this.worldBounds = { minX, minY, maxX, maxY };
        // Re-apply constraints in case current position is out of new bounds
        this._applyConstraints();
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        this._applyConstraints();
    }

    zoomAtPoint(canvasX, canvasY, zoomFactor) {
        const oldZoom = this.zoom;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, oldZoom * zoomFactor));

        if (newZoom === oldZoom) return; // No change

        // Determine world coordinates of the mouse pointer BEFORE zoom
        const worldMouseX = this.x + canvasX / oldZoom;
        const worldMouseY = this.y + canvasY / oldZoom;

        this.zoom = newZoom;

        // Adjust camera position so the world point under the mouse remains the same AFTER zoom
        this.x = worldMouseX - canvasX / this.zoom;
        this.y = worldMouseY - canvasY / this.zoom;
        
        this._applyConstraints();
        this.eventEmitter.emit('zoomchange', { zoom: this.zoom });
    }
    
    // Simple zoom, centered on screen
    setZoom(level) {
        const canvasCenterX = this.gameWidth / 2;
        const canvasCenterY = this.gameHeight / 2;
        const zoomFactor = level / this.zoom; // Calculate factor relative to current zoom
        this.zoomAtPoint(canvasCenterX, canvasCenterY, zoomFactor);
    }

    _applyConstraints() {
        // Calculate visible world dimensions based on current zoom
        const visibleWorldWidth = this.gameWidth / this.zoom;
        const visibleWorldHeight = this.gameHeight / this.zoom;

        // Prevent camera from moving beyond world boundaries
        this.x = Math.max(this.worldBounds.minX, Math.min(this.x, this.worldBounds.maxX - visibleWorldWidth));
        this.y = Math.max(this.worldBounds.minY, Math.min(this.y, this.worldBounds.maxY - visibleWorldHeight));
        
        // If world is smaller than viewport, center it
        if (visibleWorldWidth > (this.worldBounds.maxX - this.worldBounds.minX)) {
            this.x = this.worldBounds.minX + ((this.worldBounds.maxX - this.worldBounds.minX) - visibleWorldWidth) / 2;
        }
        if (visibleWorldHeight > (this.worldBounds.maxY - this.worldBounds.minY)) {
            this.y = this.worldBounds.minY + ((this.worldBounds.maxY - this.worldBounds.minY) - visibleWorldHeight) / 2;
        }
    }

    applyTransformations() {
        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.x, -this.y);
    }

    restoreTransformations() {
        this.ctx.restore();
    }

    // Convert screen (canvas) coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: this.x + screenX / this.zoom,
            y: this.y + screenY / this.zoom
        };
    }

    // Convert world coordinates to screen (canvas) coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }
    
    // Get current view rect in world coordinates
    getViewRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.gameWidth / this.zoom,
            height: this.gameHeight / this.zoom
        };
    }

    // Update method for any internal logic (e.g., smooth camera movements if implemented)
    update(dt) {
        // Example: if (this.inputSystem) this.updateFromKeyboard(this.inputSystem, dt);
        // This is now explicitly called from game.js update if needed.
    }
}

// Example usage in main.js:
// this.cameraSystem = new CameraSystem(this.canvasSystem.getContext(), this.canvasSystem.getWidth(), this.canvasSystem.getHeight(), this.eventEmitter);
// In Game.update(): this.cameraSystem.updateFromKeyboard(this.inputSystem, dt);
// In Game.draw():
//   this.cameraSystem.applyTransformations();
//   // ... draw game world ...
//   this.cameraSystem.restoreTransformations();
//   // ... draw UI fixed on screen ...
