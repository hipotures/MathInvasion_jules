class TowerPlacementSystem {
    constructor(mapSystem, cashManager, enemyManager, munitionsManager, inputSystem, uiManager, eventEmitter = null) {
        if (!mapSystem || !cashManager || !enemyManager || !munitionsManager || !inputSystem || !uiManager) {
            throw new Error("TowerPlacementSystem requires instances of: MapSystem, CashManager, EnemyManager, MunitionsManager, InputSystem, UIManager.");
        }
        this.mapSystem = mapSystem;
        this.cashManager = cashManager;
        this.enemyManager = enemyManager; // Needed for some tower types or advanced placement checks
        this.munitionsManager = munitionsManager; // To pass to newly created towers
        this.inputSystem = inputSystem; // For mouse position and clicks
        this.uiManager = uiManager; // To interact with tower selection UI
        this.eventEmitter = eventEmitter;

        this.isPlacingTower = false;
        this.selectedTowerType = null; // e.g., 'CannonTower' (string)
        this.selectedTowerClass = null; // e.g., CannonTower (class constructor)
        this.previewTowerInstance = null; // A temporary instance for stats and preview
        
        this.currentGridHover = { x: -1, y: -1 }; // Current grid cell mouse is over
        this.canPlaceAtCurrentHover = false;

        // Store references to actual tower classes
        // This should be populated when tower types are defined/loaded
        this.towerTypes = {
            // Example: 'CannonTower': CannonTower (the class itself)
        };
        // Register tower types (e.g., from main game setup)
        // this.registerTowerType('CannonTower', CannonTower);

        this._initEventListeners();
        console.log("TowerPlacementSystem initialized.");
    }

    registerTowerType(typeName, towerClass, stats) {
        if (typeof typeName === 'string' && typeof towerClass === 'function') {
            this.towerTypes[typeName] = { class: towerClass, stats: stats || towerClass.prototype.getStats ? towerClass.prototype.getStats() : {} };
            console.log(`TowerPlacementSystem: Registered tower type "${typeName}".`);
            // Optionally, tell UIManager to add this tower to the selection panel
            this.uiManager.addTowerToSelection(typeName, this.towerTypes[typeName].stats);
        } else {
            console.error("TowerPlacementSystem: Invalid typeName or towerClass for registration.");
        }
    }

    _initEventListeners() {
        // Listen for tower selection from UI (UIManager should emit this)
        this.eventEmitter.on('selectTowerType', (typeName) => {
            if (this.towerTypes[typeName]) {
                this.isPlacingTower = true;
                this.selectedTowerType = typeName;
                this.selectedTowerClass = this.towerTypes[typeName].class;
                // Create a temporary instance for stats and preview, but don't add to game yet
                // This requires tower constructors to handle not being fully placed.
                // Or, have static methods on tower classes to get stats.
                // For now, let's assume getStats is available on prototype or from registration.
                this.previewTowerInstance = { stats: this.towerTypes[typeName].stats }; 
                this.uiManager.updateTowerStatsPanel(this.previewTowerInstance.stats);
                console.log(`TowerPlacementSystem: Started placing ${typeName}.`);
            } else {
                console.warn(`TowerPlacementSystem: Unknown tower type "${typeName}" selected.`);
            }
        });

        // Listen for mouse clicks on the canvas for placing towers
        this.inputSystem.eventEmitter.on('click', (eventData) => {
            // TD-PLAN 4.2: CameraSystem allows drag-panning only when not in tower placement mode.
            // We need to ensure this click is not part of a pan.
            // InputSystem's click event should be high-level enough.
            if (this.isPlacingTower && eventData.button === 0) { // Left click
                this._attemptPlaceTower(eventData.worldX, eventData.worldY);
            }
        });

        // Listen for mouse movement to update preview
        this.inputSystem.eventEmitter.on('mousemove', (eventData) => {
            if (this.isPlacingTower) {
                const gridCoords = this.mapSystem.worldToGrid(eventData.worldX, eventData.worldY);
                if (gridCoords.x !== this.currentGridHover.x || gridCoords.y !== this.currentGridHover.y) {
                    this.currentGridHover = gridCoords;
                    if (this.mapSystem.isValidGridCoords(gridCoords.x, gridCoords.y)) {
                         this.canPlaceAtCurrentHover = this.mapSystem.canPlaceTower(gridCoords.x, gridCoords.y);
                    } else {
                        this.canPlaceAtCurrentHover = false;
                    }
                }
            }
        });
        
        // Listen for cancel placement (e.g., Escape key or right-click)
        this.inputSystem.eventEmitter.on('keydown:escape', () => {
            if (this.isPlacingTower) this.cancelPlacement();
        });
        this.inputSystem.eventEmitter.on('contextmenu', () => { // Right-click
            if (this.isPlacingTower) this.cancelPlacement();
        });
    }

    _attemptPlaceTower(worldX, worldY) {
        if (!this.isPlacingTower || !this.selectedTowerClass) return;

        const gridCoords = this.mapSystem.worldToGrid(worldX, worldY);
        if (!this.mapSystem.isValidGridCoords(gridCoords.x, gridCoords.y)) {
            console.log("TowerPlacementSystem: Clicked outside map bounds.");
            return;
        }

        const towerCost = this.previewTowerInstance.stats.cost || 0;

        if (this.mapSystem.canPlaceTower(gridCoords.x, gridCoords.y)) {
            if (this.cashManager.hasEnoughCash(towerCost)) {
                this.cashManager.spendCash(towerCost);
                
                // Create and add the actual tower instance to the game
                const newTower = new this.selectedTowerClass(
                    this.mapSystem, 
                    this.enemyManager, 
                    this.munitionsManager, 
                    gridCoords.x, 
                    gridCoords.y
                );
                
                // MapSystem needs to be updated with the new tower
                this.mapSystem.placeTower(gridCoords.x, gridCoords.y, newTower);
                
                // Add to a central list of towers (e.g., in the main Game class or an Entity Manager)
                if (this.eventEmitter) {
                    this.eventEmitter.emit('towerPlaced', newTower);
                }
                console.log(`TowerPlacementSystem: Placed ${this.selectedTowerType} at (${gridCoords.x}, ${gridCoords.y}).`);
                
                // TD-PLAN 4.9: "Potencjalnie wychodzi z trybu umieszczania lub pozwala na umieszczenie kolejnej wieży tego samego typu."
                // For now, exit placement mode. Could add shift-click to place multiple.
                // this.cancelPlacement(); // Or keep placing if player has cash
                 if (!this.cashManager.hasEnoughCash(towerCost)) { // If can't afford another one
                    this.cancelPlacement();
                 } else {
                    // Reset hover validity for next placement, as map changed
                    this.canPlaceAtCurrentHover = this.mapSystem.canPlaceTower(this.currentGridHover.x, this.currentGridHover.y);
                 }

            } else {
                console.log("TowerPlacementSystem: Not enough cash.");
                this.uiManager.showSnackbar("Not enough cash!", 3000);
                this.cancelPlacement(); // Cancel if not enough cash for this one
            }
        } else {
            console.log("TowerPlacementSystem: Cannot place tower at this location (blocked or invalid).");
            this.uiManager.showSnackbar("Cannot place tower here!", 2000);
        }
    }

    cancelPlacement() {
        this.isPlacingTower = false;
        this.selectedTowerType = null;
        this.selectedTowerClass = null;
        this.previewTowerInstance = null;
        this.currentGridHover = { x: -1, y: -1 };
        this.uiManager.clearTowerStatsPanel(); // Or UIManager handles this on mode change
        console.log("TowerPlacementSystem: Placement cancelled.");
        if (this.eventEmitter) this.eventEmitter.emit('towerPlacementCancelled');
    }

    update(dt) {
        // The core logic is event-driven (mouse clicks, key presses).
        // This update loop is mainly for drawing the preview.
        // Mouse move events update currentGridHover and canPlaceAtCurrentHover.
    }

    draw(ctx) {
        if (!this.isPlacingTower || !this.previewTowerInstance || !this.mapSystem.isValidGridCoords(this.currentGridHover.x, this.currentGridHover.y)) {
            return;
        }

        const worldX = this.currentGridHover.x * this.mapSystem.cellSize;
        const worldY = this.currentGridHover.y * this.mapSystem.cellSize;
        
        // Draw tower preview (semi-transparent)
        // This is tricky because the tower's own draw method is complex.
        // Simplification: draw a colored square and range.
        ctx.globalAlpha = 0.5;
        
        // Draw a placeholder for the tower type being placed
        const tempTowerColor = this.previewTowerInstance.stats.color || '#888888'; // Use a color from stats or default
        ctx.fillStyle = tempTowerColor;
        ctx.fillRect(worldX, worldY, this.mapSystem.cellSize, this.mapSystem.cellSize);

        // Draw range preview
        const range = this.previewTowerInstance.stats.range || this.mapSystem.cellSize * 2;
        ctx.beginPath();
        ctx.arc(worldX + this.mapSystem.cellSize / 2, worldY + this.mapSystem.cellSize / 2, range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;

        // Draw placement validity indicator (TD-PLAN 4.4 - MapSystem responsibility)
        // Or, TowerPlacementSystem can do it. Let's do it here.
        this.mapSystem.drawPlacementIndicator(this.currentGridHover.x, this.currentGridHover.y, this.canPlaceAtCurrentHover);
    }
}

// Example Usage (in main.js):
// this.towerPlacementSystem = new TowerPlacementSystem(this.mapSystem, this.cashManager, this.enemyManager, this.munitionsManager, this.inputSystem, this.uiManager, this.eventEmitter);
// // After CannonTower class is defined:
// this.towerPlacementSystem.registerTowerType('CannonTower', CannonTower);
//
// In Game.update(): this.towerPlacementSystem.update(dt); // Though mostly event driven
// In Game.draw(), after map but before UI fixed elements:
// this.towerPlacementSystem.draw(this.ctx); // Draws preview
