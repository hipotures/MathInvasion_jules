class BasicEnemy {
    constructor(mapSystem, startGridX, startGridY, targetGridX, targetGridY, enemyManager) {
        if (!mapSystem || !enemyManager) {
            throw new Error("BasicEnemy requires MapSystem and EnemyManager instances.");
        }
        this.mapSystem = mapSystem;
        this.enemyManager = enemyManager; // To report death, etc.

        // Pathfinding and Position
        this.startGridX = startGridX;
        this.startGridY = startGridY;
        this.targetGridX = targetGridX; // Player base coordinates
        this.targetGridY = targetGridY;
        
        // Initial position at the center of the start cell
        const worldStartPos = this.mapSystem.gridToWorld(startGridX, startGridY, true);
        this.x = worldStartPos.x;
        this.y = worldStartPos.y;
        
        this.path = null; // Array of {x, y} grid coordinates
        this.currentPathIndex = 0;
        this.recalculatePath(); // Get initial path

        // Stats
        this.hp = 50; // Health points
        this.maxHp = 50;
        this.speed = 50; // Pixels per second
        this.cashValue = 10; // Cash awarded on defeat
        this.radius = this.mapSystem.cellSize * 0.3; // For collision detection and drawing
        this.damageToBase = 10; // Damage dealt if it reaches the base

        this.isActive = true; // Becomes false on death or reaching base

        // Visuals
        this.color = 'sandybrown';
        this.borderColor = 'darkred';
        this.hpBarHeight = 4;
        this.hpBarWidth = this.radius * 2;
        this.hpBarColor = 'red';
        this.hpBarBackgroundColor = 'darkgreen'; // Opposite of player base for contrast
        
        // Effects (e.g., slow, DoT) - TD-PLAN 5.2
        this.effects = []; // Array of effect objects { type, duration, strength, update(), onEnd() }

        console.log(`BasicEnemy created at (${this.x.toFixed(2)}, ${this.y.toFixed(2)}) targeting (${targetGridX}, ${targetGridY})`);
    }

    recalculatePath() {
        this.path = this.mapSystem.findPath(this.startGridX, this.startGridY, this.targetGridX, this.targetGridY);
        if (!this.path || this.path.length === 0) {
            console.warn("BasicEnemy: No path found or path is empty.");
            // This enemy might be stuck or the map changed.
            // It could try finding a path from its current grid cell if startGridX/Y is not current.
            const currentGridPos = this.mapSystem.worldToGrid(this.x, this.y);
            this.path = this.mapSystem.findPath(currentGridPos.x, currentGridPos.y, this.targetGridX, this.targetGridY);
            if (!this.path || this.path.length === 0) {
                console.error("BasicEnemy: Still no path from current location. Enemy is stuck.");
                this.isActive = false; // Consider deactivating if truly stuck
                return;
            }
        }
        this.currentPathIndex = 0; // Reset path index
        // The first point in the path is usually the start cell itself.
        // We want to move towards the *next* cell in the path.
        if (this.path.length > 1) {
             this.currentPathIndex = 1;
        } else if (this.path.length === 1 && (this.path[0].x !== this.targetGridX || this.path[0].y !== this.targetGridY)) {
            // Path is just the start node, and it's not the target. This means it's stuck at start.
            console.warn("BasicEnemy: Path is only the start node and it's not the target. Stuck.");
        }
    }
    
    // Called by MapSystem if map structure changes
    onMapStructureChanged() {
        const currentGridPos = this.mapSystem.worldToGrid(this.x, this.y);
        this.startGridX = currentGridPos.x; // Update start for pathfinding from current pos
        this.startGridY = currentGridPos.y;
        this.recalculatePath();
    }

    takeDamage(amount) {
        if (!this.isActive) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.onDie();
        }
    }

    heal(amount) { // TD-PLAN 5.2
        if (!this.isActive) return;
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }
    
    addEffect(effect) { // TD-PLAN 5.2
        // Remove existing effect of the same type to restart it, or stack if allowed
        // For simplicity, let's assume effects don't stack and a new one replaces old of same type
        this.effects = this.effects.filter(e => e.type !== effect.type);
        this.effects.push(effect);
        if (effect.onApply) effect.onApply(this);
        console.log(`Effect ${effect.type} applied to enemy.`);
    }

    updateEffects(dt) {
        let currentSpeedMultiplier = 1.0;
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            if (effect.update) effect.update(this, dt); // Effect might modify enemy directly
            
            if (effect.duration !== undefined) {
                effect.duration -= dt;
                if (effect.duration <= 0) {
                    if (effect.onEnd) effect.onEnd(this);
                    this.effects.splice(i, 1);
                    console.log(`Effect ${effect.type} ended.`);
                }
            }
            // Example: Slow effect directly modifies speed multiplier
            if (effect.type === 'slow' && effect.speedMultiplier) {
                currentSpeedMultiplier *= effect.speedMultiplier;
            }
        }
        return currentSpeedMultiplier; // Return aggregate speed multiplier
    }

    onDie() {
        this.isActive = false;
        this.enemyManager.handleEnemyDefeated(this, this.cashValue);
        console.log("BasicEnemy died.");
        // Could trigger an animation or particle effect here via an event
    }

    update(dt) {
        if (!this.isActive || !this.path || this.path.length === 0 || this.currentPathIndex >= this.path.length) {
            // If no path or path completed, and not at base, it might be stuck or an issue.
            // If at base, it should have been handled by reaching target.
            if (this.isActive && (!this.path || this.path.length === 0)) {
                 console.warn("Enemy update called but no path or path ended prematurely and not at base.");
                 // Attempt to get a new path from current location
                 const currentGrid = this.mapSystem.worldToGrid(this.x, this.y);
                 this.startGridX = currentGrid.x;
                 this.startGridY = currentGrid.y;
                 this.recalculatePath(); // Try to recover
            }
            return;
        }

        const speedMultiplier = this.updateEffects(dt); // Update active effects and get speed mod
        const currentSpeed = this.speed * speedMultiplier;

        const targetGridCell = this.path[this.currentPathIndex];
        const targetWorldPos = this.mapSystem.gridToWorld(targetGridCell.x, targetGridCell.y, true); // Move towards center of cell

        const dx = targetWorldPos.x - this.x;
        const dy = targetWorldPos.y - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        if (distanceToTarget < currentSpeed * dt) { // Close enough to snap to target
            this.x = targetWorldPos.x;
            this.y = targetWorldPos.y;
            this.currentPathIndex++;

            if (this.currentPathIndex >= this.path.length) { // Reached end of path
                // Check if end of path is the player base
                if (targetGridCell.x === this.targetGridX && targetGridCell.y === this.targetGridY) {
                    this.isActive = false;
                    this.enemyManager.handleEnemyReachedBase(this, this.damageToBase);
                    console.log("BasicEnemy reached the base.");
                } else {
                    // Path ended but not at the base. This might happen if base is unreachable.
                    console.warn("BasicEnemy reached end of path, but not at player base. Current loc:", targetGridCell.x, targetGridCell.y, "Target:", this.targetGridX, this.targetGridY);
                    // Attempt to find a new path from this point
                    this.startGridX = targetGridCell.x;
                    this.startGridY = targetGridCell.y;
                    this.recalculatePath();
                }
            }
        } else { // Move towards target
            this.x += (dx / distanceToTarget) * currentSpeed * dt;
            this.y += (dy / distanceToTarget) * currentSpeed * dt;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // HP Bar
        if (this.hp < this.maxHp) {
            const barX = this.x - this.radius;
            const barY = this.y - this.radius - this.hpBarHeight - 2; // Position above the enemy

            ctx.fillStyle = this.hpBarBackgroundColor;
            ctx.fillRect(barX, barY, this.hpBarWidth, this.hpBarHeight);

            const currentHpWidth = (this.hp / this.maxHp) * this.hpBarWidth;
            ctx.fillStyle = this.hpBarColor;
            ctx.fillRect(barX, barY, currentHpWidth, this.hpBarHeight);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, this.hpBarWidth, this.hpBarHeight);
        }
        
        // Draw effects (e.g., a blueish tint for slow)
        this.effects.forEach(effect => {
            if (effect.draw) effect.draw(ctx, this);
        });
    }
}

// Example usage in main.js or EnemyManager:
// Assuming mapSystem, enemyManager, playerBase (for target coords) are available
// const startSpawn = mapSystem.getEnemySpawnCoords()[0]; // Get first spawn point
// if (startSpawn && playerBase) {
//   const newEnemy = new BasicEnemy(mapSystem, startSpawn.x, startSpawn.y, playerBase.gridX, playerBase.gridY, enemyManager);
//   enemyManager.addEnemy(newEnemy);
// }
