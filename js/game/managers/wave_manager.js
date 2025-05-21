class WaveManager {
    constructor(mapSystem, enemyManager, uiManager, eventEmitter = null) {
        if (!mapSystem || !enemyManager || !uiManager) {
            throw new Error("WaveManager requires MapSystem, EnemyManager, and UIManager instances.");
        }
        this.mapSystem = mapSystem;
        this.enemyManager = enemyManager;
        this.uiManager = uiManager;
        this.eventEmitter = eventEmitter;

        this.currentWaveNumber = 0;
        this.timeToNextWave = 0; // Countdown in seconds
        this.interWaveTime = 15; // Time between waves in seconds (TD-PLAN: 7s, adjustable)
        this.timeSinceLastSpawn = 0;
        
        this.isSpawning = false;
        this.waveDefinitions = this._defineWaves(); // Method to get all wave structures
        this.currentWaveDefinition = null; // { groups: [{ type, count, delay, mods }, ...], spawnIndex, groupIndex }
        
        this.isRunning = false; // Flag to control overall wave generation (e.g., for game over)
        this.playerBaseTargetCoords = null; // To pass to enemies

        if (this.eventEmitter) {
            this.eventEmitter.on('playerBaseInitialized', (base) => {
                this.playerBaseTargetCoords = this.mapSystem.worldToGrid(base.x, base.y);
            });
             this.eventEmitter.on('startGame', () => this.start()); // Auto-start on game start
        }
        
        this.uiManager.updateWaveNumber(this.currentWaveNumber);
        this.uiManager.updateWaveTimer(this.timeToNextWave > 0 ? this.timeToNextWave : "Waiting...");

        console.log("WaveManager initialized.");
    }

    _defineWaves() {
        // TD-PLAN 4.8: Defines structure of waves.
        // Each wave is an array of groups. Each group: { type, count, spawnDelay, mods }
        // `spawnDelay` is delay between enemies within this group.
        // `mods` can be { hpMultiplier, speedMultiplier }
        return [
            // Wave 1
            { 
                groups: [
                    { type: 'BasicEnemy', count: 5, spawnDelay: 1.0, mods: {} },
                ]
            },
            // Wave 2
            { 
                groups: [
                    { type: 'BasicEnemy', count: 8, spawnDelay: 0.8, mods: {} },
                    { type: 'BasicEnemy', count: 3, spawnDelay: 0.5, mods: { hpMultiplier: 1.2 } },
                ]
            },
            // Wave 3
            {
                groups: [
                    { type: 'BasicEnemy', count: 10, spawnDelay: 0.7, mods: {} },
                    { type: 'BasicEnemy', count: 5, spawnDelay: 0.6, mods: { speedMultiplier: 1.2 } },
                ]
            },
            // Add more complex waves here...
            // Example with different enemy types (assuming they exist)
            // {
            //     groups: [
            //         { type: 'FastEnemy', count: 10, spawnDelay: 0.5, mods: {} },
            //         { type: 'ArmoredEnemy', count: 3, spawnDelay: 1.5, mods: {} },
            //     ]
            // }
        ];
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.currentWaveNumber = 0;
        this.timeToNextWave = this.interWaveTime / 3; // Shorter time for first wave
        this.uiManager.updateWaveNumber(this.currentWaveNumber);
        console.log("WaveManager started. First wave incoming soon.");
    }

    stop() {
        this.isRunning = false;
        this.isSpawning = false;
        console.log("WaveManager stopped.");
    }

    update(dt) {
        if (!this.isRunning || !this.playerBaseTargetCoords) {
            return;
        }

        if (this.isSpawning) {
            this.timeSinceLastSpawn += dt;
            const currentGroup = this.currentWaveDefinition.groups[this.currentWaveDefinition.groupIndex];
            
            if (this.timeSinceLastSpawn >= currentGroup.spawnDelay) {
                this.timeSinceLastSpawn = 0; // Reset timer for next spawn in group
                this._spawnEnemyFromGroup(currentGroup);
                currentGroup.spawnedCount = (currentGroup.spawnedCount || 0) + 1;

                if (currentGroup.spawnedCount >= currentGroup.count) {
                    // Current group finished spawning
                    this.currentWaveDefinition.groupIndex++;
                    if (this.currentWaveDefinition.groupIndex >= this.currentWaveDefinition.groups.length) {
                        // All groups in the current wave finished spawning
                        this.isSpawning = false;
                        console.log(`Wave ${this.currentWaveNumber} fully spawned.`);
                        // Wave is considered "over" when all enemies are spawned AND defeated.
                        // For now, we start countdown to next wave once spawning is done.
                        // A more advanced logic would wait for all enemies of current wave to be cleared.
                    }
                }
            }
        } else { // Between waves or waiting for active enemies to clear
            if (this.enemyManager.getActiveEnemiesCount() === 0 && this.currentWaveNumber > 0 && this.currentWaveNumber >= this.waveDefinitions.length) {
                 console.log("All defined waves completed and enemies cleared. VICTORY (for now)!");
                 this.uiManager.showSnackbar("All waves cleared! YOU WIN!", 0); // 0 for permanent
                 this.stop(); // Stop further wave processing
                 if(this.eventEmitter) this.eventEmitter.emit('allWavesCleared');
                 return;
            }
            
            // Only start countdown if all enemies from PREVIOUS wave are cleared,
            // OR if it's the very first wave (currentWaveNumber is 0).
            if (this.enemyManager.getActiveEnemiesCount() === 0 || this.currentWaveNumber === 0) {
                this.timeToNextWave -= dt;
                this.uiManager.updateWaveTimer(Math.max(0, Math.ceil(this.timeToNextWave)));

                if (this.timeToNextWave <= 0) {
                    this._startNextWave();
                }
            } else {
                 this.uiManager.updateWaveTimer("Waiting..."); // Waiting for enemies to clear
            }
        }
    }

    _startNextWave() {
        if (this.currentWaveNumber >= this.waveDefinitions.length) {
            console.log("All defined waves have been initiated.");
             // Game doesn't end here, but waits for enemies to clear. See update loop.
            this.uiManager.updateWaveTimer("All waves sent!");
            // If we want continuous play, generate more waves or scale existing ones.
            return;
        }

        this.currentWaveNumber++;
        this.currentWaveDefinition = JSON.parse(JSON.stringify(this.waveDefinitions[this.currentWaveNumber - 1])); // Deep copy
        this.currentWaveDefinition.groupIndex = 0;
        this.currentWaveDefinition.groups.forEach(g => g.spawnedCount = 0); // Initialize spawned count

        this.isSpawning = true;
        this.timeSinceLastSpawn = 0; // Ready to spawn first enemy of the new wave immediately
        this.timeToNextWave = this.interWaveTime; // Reset countdown for the wave AFTER this one

        this.uiManager.updateWaveNumber(this.currentWaveNumber);
        this.uiManager.updateWaveTimer(0); // Show 0 or "Spawning" during wave
        console.log(`Starting Wave ${this.currentWaveNumber}`);
        if(this.eventEmitter) this.eventEmitter.emit('waveStarted', { waveNumber: this.currentWaveNumber });
    }

    _spawnEnemyFromGroup(group) {
        const spawnPoints = this.mapSystem.getEnemySpawnCoords();
        if (spawnPoints.length === 0) {
            console.error("WaveManager: No enemy spawn points defined on map!");
            this.isSpawning = false; // Stop spawning if no points
            return;
        }
        
        // TD-PLAN 2.3: Difficulty affects number of active spawn points.
        // This needs difficulty level from UrlParamManager or game settings.
        // For now, use all available spawn points.
        // Later, filter spawnPoints based on difficulty.
        const activeSpawnPoints = spawnPoints; // TODO: Filter by difficulty

        for (const spawnPoint of activeSpawnPoints) {
            let enemyType = group.type; // e.g., 'BasicEnemy'
            let enemyClass;

            // This is a simple way to get class by name. A factory or registry is more robust.
            if (enemyType === 'BasicEnemy') {
                enemyClass = window.BasicEnemy; // Assumes BasicEnemy is globally accessible
            } else {
                console.warn(`WaveManager: Unknown enemy type "${enemyType}" in wave definition.`);
                try {
                    enemyClass = window[enemyType]; // Try to get it globally
                    if (!enemyClass) throw new Error("Not found");
                } catch (e) {
                     console.error(`Failed to find class for enemy type: ${enemyType}. Skipping spawn.`);
                     return;
                }
            }
            
            if (!enemyClass) {
                console.error(`WaveManager: Class for enemy type "${enemyType}" not found. Cannot spawn.`);
                continue;
            }

            const newEnemy = new enemyClass(
                this.mapSystem,
                spawnPoint.x,
                spawnPoint.y,
                this.playerBaseTargetCoords.x,
                this.playerBaseTargetCoords.y,
                this.enemyManager
            );

            // Apply modifiers from wave definition (TD-PLAN 4.8)
            if (group.mods) {
                if (group.mods.hpMultiplier && newEnemy.hp) {
                    newEnemy.hp = Math.round(newEnemy.hp * group.mods.hpMultiplier);
                    newEnemy.maxHp = Math.round(newEnemy.maxHp * group.mods.hpMultiplier);
                }
                if (group.mods.speedMultiplier && newEnemy.speed) {
                    newEnemy.speed *= group.mods.speedMultiplier;
                }
                // Add other mods as needed (e.g., cashValueMultiplier)
            }
            this.enemyManager.addEnemy(newEnemy);
        }
        // console.log(`Spawned one set of ${group.type} from ${activeSpawnPoints.length} points.`);
    }
    
    // Call this if player base is set up after wave manager
    setPlayerBaseTarget(baseEntity) {
        if (baseEntity) {
             this.playerBaseTargetCoords = this.mapSystem.worldToGrid(baseEntity.x, baseEntity.y);
             console.log("WaveManager: Player base target coordinates updated.");
        }
    }
}

// Ensure BasicEnemy (and other enemy types) are defined globally or use a factory.
// window.BasicEnemy = BasicEnemy; // If BasicEnemy is not already global.

// Example usage in main.js:
// this.waveManager = new WaveManager(this.mapSystem, this.enemyManager, this.uiManager, this.eventEmitter);
// this.eventEmitter.emit('playerBaseInitialized', this.playerBase); // Trigger target coords setup
// this.waveManager.start(); // Or listen to a 'startGame' event
// In Game.update(): this.waveManager.update(dt);
