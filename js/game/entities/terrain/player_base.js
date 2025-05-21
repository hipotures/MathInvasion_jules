class PlayerBase {
    constructor(gridX, gridY, mapSystem, initialHp = 100) {
        if (!mapSystem) {
            throw new Error("PlayerBase requires a MapSystem instance.");
        }
        this.mapSystem = mapSystem;
        this.gridX = gridX;
        this.gridY = gridY;
        
        const worldPos = this.mapSystem.gridToWorld(this.gridX, this.gridY);
        this.x = worldPos.x; // World x coordinate (top-left of cell)
        this.y = worldPos.y; // World y coordinate (top-left of cell)
        this.width = this.mapSystem.cellSize;
        this.height = this.mapSystem.cellSize;

        this.maxHp = initialHp;
        this.hp = initialHp;
        
        this.color = '#3498DB'; // A distinct blue color for the base
        this.borderColor = '#2980B9';
        this.hpBarColor = 'green';
        this.hpBarBackgroundColor = 'red';
        this.hpBarHeight = 5;
        this.hpBarWidth = this.width;

        // Register with the map system
        this.mapSystem.setPlayerBase(this.gridX, this.gridY, this);
        console.log(`PlayerBase initialized at grid (${this.gridX}, ${this.gridY}), HP: ${this.hp}`);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
        console.log(`PlayerBase took ${amount} damage, HP is now ${this.hp}`);
        if (this.mapSystem.eventEmitter) {
            this.mapSystem.eventEmitter.emit('playerBaseHpChanged', { currentHp: this.hp, maxHp: this.maxHp });
        }
        if (this.hp === 0) {
            this.handleDestruction();
        }
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
        if (this.mapSystem.eventEmitter) {
            this.mapSystem.eventEmitter.emit('playerBaseHpChanged', { currentHp: this.hp, maxHp: this.maxHp });
        }
    }

    handleDestruction() {
        console.log("PlayerBase has been destroyed! Game Over.");
        if (this.mapSystem.eventEmitter) {
            this.mapSystem.eventEmitter.emit('playerBaseDestroyed');
        }
        // Further game over logic will be handled by the main game class
    }

    // The MapSystem is responsible for drawing terrain cell types.
    // This draw method is for details on top of that, like HP bar or specific animations.
    draw(ctx) {
        // Main base color (already drawn by MapSystem if cell type is set)
        // For now, let's assume MapSystem draws a placeholder color,
        // and this draw method adds details or overrides.
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Draw HP bar if damaged
        if (this.hp < this.maxHp) {
            const barX = this.x;
            const barY = this.y - this.hpBarHeight - 2; // Position above the base

            // Background of HP bar
            ctx.fillStyle = this.hpBarBackgroundColor;
            ctx.fillRect(barX, barY, this.hpBarWidth, this.hpBarHeight);

            // Foreground of HP bar
            const currentHpWidth = (this.hp / this.maxHp) * this.hpBarWidth;
            ctx.fillStyle = this.hpBarColor;
            ctx.fillRect(barX, barY, currentHpWidth, this.hpBarHeight);
            
            // Border for HP bar
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, this.hpBarWidth, this.hpBarHeight);
        }
    }
    
    update(dt) {
        // Player base might have animations or passive effects later
    }
}

// Example usage in main.js, after mapSystem is initialized:
// const baseGridX = Math.floor(this.mapSystem.gridWidth / 2);
// const baseGridY = Math.floor(this.mapSystem.gridHeight / 2);
// this.playerBase = new PlayerBase(baseGridX, baseGridY, this.mapSystem, 100);
//
// In Game.draw() loop, after camera transformations and map drawing:
// if (this.playerBase) this.playerBase.draw(this.ctx);
