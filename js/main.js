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
        this.eventEmitter = null; // Will be initialized in init()

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
        this.gameWidth = this.canvas.width; 
        this.gameHeight = this.canvas.height;

        // TD-PLAN: The loop should be paused when the window loses focus.
        window.addEventListener('blur', () => this.pauseGame());
        window.addEventListener('focus', () => this.resumeGame());
        
        // Initialize EventEmitter
        if (typeof EventEmitter !== 'undefined') {
            this.eventEmitter = new EventEmitter();
        } else {
            console.error("EventEmitter class not found! Game events will not work.");
            this.eventEmitter = { 
                on: (eventName, handler) => console.warn(`Dummy Emitter: Registered ${eventName}`), 
                emit: (eventName, data) => console.warn(`Dummy Emitter: Emitted ${eventName} with data:`, data) 
            };
        }
        
        // Listen for player base destruction
        // PlayerBase emits 'playerBaseDestroyed' via mapSystem.eventEmitter.
        // This assumes the Game's eventEmitter is passed to MapSystem, and then to PlayerBase.
        this.eventEmitter.on('playerBaseDestroyed', () => this.triggerGameOver());

        // Initialize other systems (stubs for now - will be filled in other subtasks)
        // this.uiManager = new UIManager(this.eventEmitter);
        // this.canvasSystem = new CanvasSystem('game-canvas', this.eventEmitter);
        // this.inputSystem = new InputSystem(this.canvasSystem.getCanvas(), this.eventEmitter, this.cameraSystem);
        // this.cameraSystem = new CameraSystem(this.ctx, this.gameWidth, this.gameHeight, this.eventEmitter);
        // this.mapSystem = new MapSystem(this.ctx, 20, 15, 40, this.eventEmitter); // Example: 20x15 grid, 40px cells
        // this.cashManager = new CashManager(100, this.uiManager, this.eventEmitter);
        // this.playerBase = new PlayerBase(10, 7, this.mapSystem, 100, this.eventEmitter); // Pass emitter if PlayerBase uses it directly
        // this.enemyManager = new EnemyManager(this.mapSystem, this.cashManager, this.playerBase, this.eventEmitter);
        // this.waveManager = new WaveManager(this.mapSystem, this.enemyManager, this.uiManager, this.eventEmitter);
        // this.munitionsManager = new MunitionsManager(this.eventEmitter);
        // this.towerPlacementSystem = new TowerPlacementSystem(this.mapSystem, this.cashManager, this.enemyManager, this.munitionsManager, this.inputSystem, this.uiManager, this.eventEmitter);

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

            // If game is paused, skip updates and drawing.
            if (this.isPaused) {
                return;
            }

            // If game is over, skip updates, but drawing might continue for a game over screen.
            // For now, the current logic stops drawing as well by returning.
            // This fulfills "skip update()".
            if (this.gameOver) {
                // Potentially, call a specific drawGameOver() method here if needed.
                return; 
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
        // Update game logic here (Order of updates can be important)
        // if (this.cameraSystem) this.cameraSystem.update(dt); // Handles keyboard panning if inputSystem is passed to it
        // if (this.inputSystem) this.inputSystem.update(); // Process inputs
        // if (this.waveManager) this.waveManager.update(dt);
        // if (this.enemyManager) this.enemyManager.updateEnemies(dt);
        // if (this.munitionsManager) this.munitionsManager.updateMunitions(dt);
        // // Towers update: if (this.towers) this.towers.forEach(tower => tower.update(dt));
        // if (this.towerPlacementSystem) this.towerPlacementSystem.update(dt);
        // if (this.playerBase) this.playerBase.update(dt);

        // Game over is now event-driven by playerBase.hp <= 0
    }

    draw() {
        // console.log("Game draw");
        // Clear canvas (or handled by canvasSystem)
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        this.ctx.fillStyle = '#ddd'; // From style.css background for canvas
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

        // Apply camera transformations
        // if (this.cameraSystem) this.cameraSystem.applyTransformations();

        // Draw game elements in order
        // if (this.mapSystem) {
        //     this.mapSystem.drawGrid();
        //     this.mapSystem.drawTerrain();
        // }
        // if (this.playerBase) this.playerBase.draw(this.ctx);
        // if (this.enemyManager) this.enemyManager.drawEnemies(this.ctx);
        // if (this.munitionsManager) this.munitionsManager.drawMunitions(this.ctx);
        // // if (this.towers) this.towers.forEach(tower => tower.draw(this.ctx));
        // if (this.towerPlacementSystem) this.towerPlacementSystem.draw(this.ctx);


        // Restore context if camera transformed it
        // if (this.cameraSystem) this.cameraSystem.restoreTransformations();
        
        // Draw UI elements on top if they are part of the canvas (though most are HTML based in this plan)
    }

    pauseGame() {
        if (!this.isPaused) {
            this.isPaused = true;
            console.log("Game paused.");
            // if (this.uiManager) this.uiManager.showSnackbar("Game Paused. Click to resume.", 0, true);
        }
    }

    resumeGame() {
        if (this.isPaused) {
            this.isPaused = false;
            this.lastTime = performance.now(); 
            this.lastUpdateTime = this.lastTime;
            this.accumulatedTime = 0; 
            console.log("Game resumed.");
            // if (this.uiManager) this.uiManager.hideSnackbar(true);
        }
    }

    triggerGameOver() {
        if (this.gameOver) return; // Already game over

        this.gameOver = true;
        console.log("Game Over triggered!");

        // Stop wave spawning
        if (this.waveManager && typeof this.waveManager.stop === 'function') {
            this.waveManager.stop();
            // console.log("WaveManager stopped by Game Over."); // Logged by WaveManager.stop()
        } else {
            console.warn("Game.triggerGameOver: WaveManager not available or stop() method missing.");
        }

        // Display game over screen
        if (this.uiManager && typeof this.uiManager.showGameOverScreen === 'function') {
            this.uiManager.showGameOverScreen();
            // console.log("Game Over screen displayed by UIManager."); // Logged by UIManager
        } else {
            console.warn("Game.triggerGameOver: UIManager not available or showGameOverScreen() method missing.");
        }
        
        console.log("Game.triggerGameOver: Game updates will now cease.");
    }
}

// Initialize and start the game when the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
    window.towerDefenseGame = game; // Make it accessible for debugging
});
