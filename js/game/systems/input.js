class InputSystem {
    constructor(canvas, eventEmitter, cameraSystem = null) {
        if (!canvas || !eventEmitter) {
            throw new Error("InputSystem requires a canvas element and an EventEmitter instance.");
        }
        this.canvas = canvas;
        this.eventEmitter = eventEmitter;
        this.cameraSystem = cameraSystem; // Optional, for transforming mouse coords to world space

        this.mousePosition = { x: 0, y: 0 }; // Relative to canvas
        this.worldMousePosition = { x: 0, y: 0 }; // Relative to game world (after camera transform)
        this.isMouseDown = false;
        this.isMouseOverCanvas = false;

        this.keysPressed = {}; // Tracks state of currently pressed keys

        this._initListeners();
        console.log("InputSystem initialized.");
    }

    _initListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this._handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this._handleClick(e)); // For discrete clicks
        this.canvas.addEventListener('contextmenu', (e) => this._handleContextMenu(e)); // Prevent default right-click
        this.canvas.addEventListener('wheel', (e) => this._handleMouseWheel(e), { passive: false }); // passive:false to allow preventDefault

        this.canvas.addEventListener('mouseenter', () => { this.isMouseOverCanvas = true; });
        this.canvas.addEventListener('mouseleave', () => { this.isMouseOverCanvas = false; });

        // Keyboard events
        window.addEventListener('keydown', (e) => this._handleKeyDown(e));
        window.addEventListener('keyup', (e) => this._handleKeyUp(e));

        // Window focus events (as per TD-PLAN)
        window.addEventListener('focus', () => this.eventEmitter.emit('focusin'));
        window.addEventListener('blur', () => this.eventEmitter.emit('focusout'));
    }

    _transformMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition.x = event.clientX - rect.left;
        this.mousePosition.y = event.clientY - rect.top;

        if (this.cameraSystem) {
            const worldPos = this.cameraSystem.screenToWorld(this.mousePosition.x, this.mousePosition.y);
            this.worldMousePosition.x = worldPos.x;
            this.worldMousePosition.y = worldPos.y;
        } else {
            // If no camera, world position is same as canvas position
            this.worldMousePosition.x = this.mousePosition.x;
            this.worldMousePosition.y = this.mousePosition.y;
        }
    }

    _handleMouseMove(event) {
        this._transformMousePosition(event);
        this.eventEmitter.emit('mousemove', { 
            canvasX: this.mousePosition.x, 
            canvasY: this.mousePosition.y,
            worldX: this.worldMousePosition.x,
            worldY: this.worldMousePosition.y,
            rawEvent: event 
        });
    }

    _handleMouseDown(event) {
        this.isMouseDown = true;
        this._transformMousePosition(event);
        this.eventEmitter.emit('mousedown', { 
            button: event.button, 
            canvasX: this.mousePosition.x, 
            canvasY: this.mousePosition.y,
            worldX: this.worldMousePosition.x,
            worldY: this.worldMousePosition.y,
            rawEvent: event 
        });
    }

    _handleMouseUp(event) {
        this.isMouseDown = false;
        this._transformMousePosition(event);
        this.eventEmitter.emit('mouseup', { 
            button: event.button, 
            canvasX: this.mousePosition.x, 
            canvasY: this.mousePosition.y,
            worldX: this.worldMousePosition.x,
            worldY: this.worldMousePosition.y,
            rawEvent: event 
        });
    }
    
    _handleClick(event) {
        this._transformMousePosition(event);
        this.eventEmitter.emit('click', { 
            button: event.button, 
            canvasX: this.mousePosition.x, 
            canvasY: this.mousePosition.y,
            worldX: this.worldMousePosition.x,
            worldY: this.worldMousePosition.y,
            rawEvent: event 
        });
    }

    _handleContextMenu(event) {
        event.preventDefault(); // Prevent browser context menu
        this._transformMousePosition(event);
        this.eventEmitter.emit('contextmenu', { 
            canvasX: this.mousePosition.x, 
            canvasY: this.mousePosition.y,
            worldX: this.worldMousePosition.x,
            worldY: this.worldMousePosition.y,
            rawEvent: event 
        });
    }

    _handleMouseWheel(event) {
        event.preventDefault(); // Prevent page scrolling
        const delta = Math.sign(event.deltaY);
        this.eventEmitter.emit('wheel', { 
            deltaY: delta, // Standardized: 1 for down, -1 for up
            canvasX: this.mousePosition.x, 
            canvasY: this.mousePosition.y,
            worldX: this.worldMousePosition.x,
            worldY: this.worldMousePosition.y,
            rawEvent: event 
        });
        // TD-PLAN: Emitting wheel:up/down
        if (delta > 0) this.eventEmitter.emit('wheel:down', { rawEvent: event });
        else this.eventEmitter.emit('wheel:up', { rawEvent: event });
    }

    _handleKeyDown(event) {
        if (!this.keysPressed[event.key]) { // Fire event only on initial press
            this.keysPressed[event.key] = true;
            this.eventEmitter.emit('keydown', { key: event.key, code: event.code, rawEvent: event });
            this.eventEmitter.emit(`keydown:${event.key.toLowerCase()}`, { rawEvent: event });
            if (event.key.startsWith("Arrow")) {
                this.eventEmitter.emit(`keydown:${event.key}`, { rawEvent: event }); // For ArrowUp, ArrowDown etc.
            }
        }
    }

    _handleKeyUp(event) {
        delete this.keysPressed[event.key];
        this.eventEmitter.emit('keyup', { key: event.key, code: event.code, rawEvent: event });
        this.eventEmitter.emit(`keyup:${event.key.toLowerCase()}`, { rawEvent: event });
        if (event.key.startsWith("Arrow")) {
            this.eventEmitter.emit(`keyup:${event.key}`, { rawEvent: event });
        }
    }

    // Public getters
    getMouseCanvasPosition() {
        return { ...this.mousePosition };
    }

    getMouseWorldPosition() {
        return { ...this.worldMousePosition };
    }

    isKeyPressed(keyName) {
        return !!this.keysPressed[keyName];
    }
    
    isMouseOver() {
        return this.isMouseOverCanvas;
    }

    // Method to be called by the game's main update loop if any per-frame processing is needed
    // For example, for continuous key press checks if not using event-driven approach for all actions
    update() {
        // Currently, this system is purely event-driven, so update might not be strictly necessary
        // unless we want to implement features like continuous press for camera movement here.
        // For example, if camera movement is tied to arrow keys being held down:
        // if (this.isKeyPressed('ArrowUp')) this.eventEmitter.emit('hold:ArrowUp');
        // if (this.isKeyPressed('ArrowDown')) this.eventEmitter.emit('hold:ArrowDown');
        // etc.
    }
}

// Usage in main.js (example):
// this.eventEmitter = new EventEmitter(); // Assuming it's created
// this.canvasSystem = new CanvasSystem('game-canvas');
// this.inputSystem = new InputSystem(this.canvasSystem.getCanvas(), this.eventEmitter, this.cameraSystem);
//
// this.eventEmitter.on('keydown:escape', () => { console.log('Escape key pressed!'); });
// this.eventEmitter.on('click', (data) => { console.log('Mouse clicked at:', data.worldX, data.worldY); });
