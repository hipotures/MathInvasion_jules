class CanvasSystem {
    constructor(canvasId = 'game-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found.`);
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Default dimensions, can be overridden by game settings
        this.width = this.canvas.width || 800;
        this.height = this.canvas.height || 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.backgroundColor = '#DDDDDD'; // Default background color (light grey)

        // Store current transformation matrix - useful for camera or complex transforms
        this.transformMatrix = this.ctx.getTransform(); 

        // Event emitter for canvas-related events, e.g., resize
        this.eventEmitter = new EventEmitter(); // Assumes EventEmitter is globally available or imported

        window.addEventListener('resize', () => this.handleResize());
        console.log("CanvasSystem initialized.");
    }

    getContext() {
        return this.ctx;
    }

    getCanvas() {
        return this.canvas;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    // Sets the canvas dimensions. Game logic should decide new dimensions.
    setDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.eventEmitter.emit('canvasResize', { width: this.width, height: this.height });
        console.log(`Canvas resized to: ${this.width}x${this.height}`);
    }
    
    // Example: Resize canvas to fill a portion of the window or a container.
    // For this game, fixed size is probably fine, but responsive is good practice.
    handleResize() {
        // For now, let's assume a fixed size, but one could implement responsive logic here.
        // For example, to make it responsive to #game-container size:
        // const container = document.getElementById('game-container');
        // if (container) {
        //     this.setDimensions(container.clientWidth, container.clientHeight);
        // }
        // console.log("Window resized. CanvasSystem could adapt canvas size if needed.");
    }

    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear properly
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }

    // Methods to track and apply transformations (could be expanded or used by CameraSystem)
    saveTransform() {
        this.transformMatrix = this.ctx.getTransform();
    }

    restoreTransform() {
        this.ctx.setTransform(this.transformMatrix);
    }

    // Method to subscribe to canvas events
    on(eventName, listener) {
        this.eventEmitter.on(eventName, listener);
    }
}

// Make sure EventEmitter is defined, e.g., in js/lib/event_emitter.js
// For now, a placeholder if not yet loaded:
if (typeof EventEmitter === 'undefined') {
    console.warn("EventEmitter class is not defined. CanvasSystem might not work as expected regarding events.");
    // Basic EventEmitter placeholder
    class EventEmitter {
        constructor() { this.events = {}; }
        on(event, listener) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(listener);
        }
        emit(event, ...args) {
            if (this.events[event]) {
                this.events[event].forEach(listener => listener(...args));
            }
        }
    }
    window.EventEmitter = EventEmitter; // Make it global for now
}
