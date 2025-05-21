// Polyfill for requestAnimationFrame
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
              window.setTimeout(callback, 1000 / 60); // 60 FPS fallback
            };
})();

window.cancelAnimFrame = (function() {
    return window.cancelAnimationFrame ||
           window.webkitCancelAnimationFrame ||
           window.mozCancelAnimationFrame ||
           function(id) {
               window.clearTimeout(id);
           };
})();

class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameWidth = 800; // Default, will be updated
        this.gameHeight = 600; // Default, will be updated

        this.lastTime = 0;
        this.gameLoopId = null;
        this.isPaused = false; // To pause game when window loses focus

        // Game systems and managers will be initialized here
        this.canvasSystem = null;
        this.inputSystem = null;
        this.cameraSystem = null;
        this.mapSystem = null;
        this.towerPlacementSystem = null;
        this.cashManager = null;
        this.enemyManager = null;
        this.waveManager = null;
        this.munitionsManager = null;
        this.uiManager = null;
        this.urlParamManager = null;
        
        this.playerBase = null;
        this.gameOver = false;
        this.targetFPS = 60; // From TD-PLAN
        this.updateInterval = 1000 / this.targetFPS;
        this.lastUpdateTime = 0;
        this.accumulatedTime = 0;

        console.log("Game constructor loaded.");
    }

    init() {
        console.log("Initializing game...");

        // Placeholder: Initialize canvas and context
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error("Canvas element not found!");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.gameWidth = this.canvas.width; // Or set a default and update canvas
        this.gameHeight = this.canvas.height;

        // TD-PLAN: The loop should be paused when the window loses focus.
        window.addEventListener('blur', () => this.pauseGame());
        window.addEventListener('focus', () => this.resumeGame());
        
        // Initialize other systems (stubs for now)
        // this.canvasSystem = new CanvasSystem(this.canvas);
        // this.inputSystem = new InputSystem(this.canvas);
        // this.cameraSystem = new CameraSystem(this.ctx, this.gameWidth, this.gameHeight);
        // this.mapSystem = new MapSystem(this.ctx, 10, 10, 60); // Example: 10x10 grid, 60px cells
        // this.uiManager = new UIManager();
        // this.cashManager = new CashManager(100, this.uiManager); // Initial cash: 100
        // ... and so on for other managers/systems

        this.lastTime = performance.now();
        this.lastUpdateTime = this.lastTime;
        
        console.log("Game initialized.");
        this.startGameLoop();
    }

    startGameLoop() {
        if (this.gameLoopId) {
            cancelAnimFrame(this.gameLoopId);
        }
        const loop = (currentTime) => {
            this.gameLoopId = requestAnimFrame(loop);
            
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            if (this.isPaused || this.gameOver) {
                return; // Skip update and draw if paused or game over
            }

            this.accumulatedTime += deltaTime;

            // TD-PLAN: Main Update Loop executed at fixed time steps
            while (this.accumulatedTime >= this.updateInterval) {
                this.update(this.updateInterval / 1000); // Pass delta time in seconds
                this.lastUpdateTime += this.updateInterval;
                this.accumulatedTime -= this.updateInterval;
            }
            
            this.draw();
        };
        this.gameLoopId = requestAnimFrame(loop);
        console.log("Game loop started.");
    }

    update(dt) {
        // console.log("Game update, dt:", dt);
        // Update game logic here
        // this.cameraSystem.update(dt);
        // this.inputSystem.update(); // Process inputs
        // this.waveManager.update(dt);
        // this.enemyManager.update(dt, this.mapSystem);
        // this.munitionsManager.update(dt);
        // this.towerPlacementSystem.update(this.inputSystem.getMousePos(), this.mapSystem);

        // Check for game over condition
        // if (this.playerBase && this.playerBase.hp <= 0 && !this.gameOver) {
        //     this.triggerGameOver();
        // }
    }

    draw() {
        // console.log("Game draw");
        // Clear canvas (or handled by canvasSystem)
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        this.ctx.fillStyle = '#ddd'; // From style.css background for canvas
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

        // Apply camera transformations
        // this.cameraSystem.applyTransformations();

        // Draw game elements in order
        // this.mapSystem.drawGrid();
        // this.mapSystem.drawTerrain();
        // this.munitionsManager.draw(this.ctx);
        // this.enemyManager.draw(this.ctx);
        // this.towerPlacementSystem.draw(this.ctx); // For tower preview

        // Restore context if camera transformed it
        // this.cameraSystem.restoreTransformations();
        
        // Draw UI elements on top if they are part of the canvas (though most are HTML)
    }

    pauseGame() {
        if (!this.isPaused) {
            this.isPaused = true;
            console.log("Game paused.");
            // Optionally, display a pause message via UIManager
            // if (this.uiManager) this.uiManager.showSnackbar("Game Paused. Click to resume.", 0);
        }
    }

    resumeGame() {
        if (this.isPaused) {
            this.isPaused = false;
            this.lastTime = performance.now(); // Reset lastTime to avoid large deltaTime jump
            this.lastUpdateTime = this.lastTime;
            this.accumulatedTime = 0; // Reset accumulated time
            console.log("Game resumed.");
            // if (this.uiManager) this.uiManager.hideSnackbar();
            // this.startGameLoop(); // Restart loop if it was fully stopped, or just let it continue if using isPaused flag
        }
    }

    triggerGameOver() {
        this.gameOver = true;
        console.log("Game Over!");
        // Stop game updates, wave spawning, etc.
        // if (this.waveManager) this.waveManager.stop();
        // Display game over screen via UIManager
        // if (this.uiManager) this.uiManager.showGameOverScreen();
        if (this.gameLoopId) {
            // We might not want to completely cancel the animation frame
            // if we want to show a game over screen that might have animations
            // but for now, we stop processing updates. Draw might continue for the GO screen.
            console.log("Game loop processing effectively stopped due to game over.");
        }
    }
}

// Initialize and start the game when the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
    window.towerDefenseGame = game; // Make it accessible for debugging
});
