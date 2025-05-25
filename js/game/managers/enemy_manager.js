class EnemyManager {
    constructor(mapSystem, cashManager, playerBase, eventEmitter = null) {
        if (!mapSystem || !cashManager || !playerBase) {
            throw new Error("EnemyManager requires MapSystem, CashManager, and PlayerBase instances.");
        }
        this.mapSystem = mapSystem;
        this.cashManager = cashManager;
        this.playerBase = playerBase; // To notify if base takes damage
        this.eventEmitter = eventEmitter; // For game-wide events

        this.enemies = []; // List of active enemy instances

        if (this.eventEmitter) {
            // Listen for map changes that might require enemies to update paths
            this.eventEmitter.on('mapStructureChanged', () => this.updateAllEnemyPaths());
        }
        console.log("EnemyManager initialized.");
    }

    addEnemy(enemy) {
        if (enemy && typeof enemy.update === 'function' && typeof enemy.draw === 'function') {
            this.enemies.push(enemy);
        } else {
            console.error("EnemyManager: Attempted to add invalid enemy object.", enemy);
        }
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt);
            if (!enemy.isActive) {
                this.enemies.splice(i, 1); // Remove inactive (dead or reached base) enemies
            }
        }
    }

    drawEnemies(ctx) {
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }
    }

    handleEnemyReachedBase(enemy, damageToBase) {
        console.log("EnemyManager: An enemy reached the base.");
        this.playerBase.takeDamage(damageToBase); // PlayerBase handles its own HP and game over trigger
        // Enemy is already marked inactive by itself, will be removed in next update loop
    }

    handleEnemyDefeated(enemy, cashValue) {
        console.log("EnemyManager: An enemy was defeated.");
        this.cashManager.addCash(cashValue);
        // Enemy is already marked inactive, will be removed in next update loop
    }

    // --- Helper functions as per TD-PLAN 4.6 ---
    findNearestEnemy(position, maxRange) {
        let nearestEnemy = null;
        let minDistanceSq = maxRange * maxRange;

        for (const enemy of this.enemies) {
            if (!enemy.isActive) continue;
            const dx = enemy.x - position.x;
            const dy = enemy.y - position.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                nearestEnemy = enemy;
            }
        }
        return nearestEnemy;
    }

    getEnemiesInRadius(position, radius) {
        const enemiesInRange = [];
        const radiusSq = radius * radius;

        for (const enemy of this.enemies) {
            if (!enemy.isActive) continue;
            const dx = enemy.x - position.x;
            const dy = enemy.y - position.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq <= radiusSq) {
                enemiesInRange.push(enemy);
            }
        }
        return enemiesInRange;
    }
    
    // TD-PLAN 4.6: Function to check if all enemies have a valid path
    // This is useful for the MapSystem when checking tower placement.
    // This is a simplified check; a more robust one might be needed.
    checkAllEnemiesHavePath() {
        if (!this.playerBase) return true; // No target, no path needed? Or false?
        const targetCoords = this.mapSystem.worldToGrid(this.playerBase.x, this.playerBase.y);

        for (const enemy of this.enemies) {
            if (!enemy.isActive) continue;
            // Enemy.path might be null if it just spawned or map changed.
            // A quick check: try to find a path from its current location.
            const currentEnemyGridPos = this.mapSystem.worldToGrid(enemy.x, enemy.y);
            const path = this.mapSystem.findPath(currentEnemyGridPos.x, currentEnemyGridPos.y, targetCoords.x, targetCoords.y, true); // Force recalculate for check
            if (!path || path.length === 0) {
                console.warn(`EnemyManager: Enemy at (${enemy.x}, ${enemy.y}) has no path to base.`);
                return false; // At least one enemy has no path
            }
        }
        return true;
    }

    // TD-PLAN 4.6: Function to force path recalculation for all enemies
    updateAllEnemyPaths() {
        console.log("EnemyManager: Updating paths for all active enemies due to map change.");
        for (const enemy of this.enemies) {
            if (enemy.isActive && typeof enemy.onMapStructureChanged === 'function') {
                enemy.onMapStructureChanged();
            } else if (enemy.isActive && typeof enemy.recalculatePath === 'function') {
                // Fallback if specific handler not present
                 const currentGridPos = this.mapSystem.worldToGrid(enemy.x, enemy.y);
                 enemy.startGridX = currentGridPos.x;
                 enemy.startGridY = currentGridPos.y;
                 enemy.recalculatePath();
            }
        }
    }
    
    getActiveEnemiesCount() {
        return this.enemies.length;
    }
    
    clearAllEnemies() {
        this.enemies = [];
    }
}

// Example usage in main.js:
// this.enemyManager = new EnemyManager(this.mapSystem, this.cashManager, this.playerBase, this.eventEmitter);
// In Game.update(): this.enemyManager.updateEnemies(dt);
// In Game.draw(): this.enemyManager.drawEnemies(this.ctx);
//
// When a wave spawns an enemy:
// const newEnemy = new BasicEnemy(...);
// this.enemyManager.addEnemy(newEnemy);
