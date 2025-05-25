class EnemySpawnPoint {
    constructor(gridX, gridY, mapSystem) {
        if (!mapSystem) {
            throw new Error("EnemySpawnPoint requires a MapSystem instance.");
        }
        this.mapSystem = mapSystem;
        this.gridX = gridX;
        this.gridY = gridY;

        const worldPos = this.mapSystem.gridToWorld(this.gridX, this.gridY);
        this.x = worldPos.x; // World x coordinate (top-left of cell)
        this.y = worldPos.y; // World y coordinate (top-left of cell)
        this.width = this.mapSystem.cellSize;
        this.height = this.mapSystem.cellSize;

        this.color = '#FF6347'; // Tomato red color for spawn points
        this.borderColor = '#CD5C5C'; // Indian Red

        // Register with the map system
        this.mapSystem.addEnemySpawn(this.gridX, this.gridY, this);
        console.log(`EnemySpawnPoint initialized at grid (${this.gridX}, ${this.gridY})`);
    }

    // The MapSystem is responsible for drawing terrain cell types.
    // This draw method is for details on top of that or if a more specific look is needed.
    draw(ctx) {
        // Main spawn point color
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Optional: Add some visual cue, like a portal or an X
        ctx.strokeStyle = '#8B0000'; // DarkRed
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.2, this.y + this.height * 0.2);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.8);
        ctx.moveTo(this.x + this.width * 0.8, this.y + this.height * 0.2);
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.8);
        ctx.stroke();
    }
    
    update(dt) {
        // Spawn points are generally static, but could have animations
    }
}

// Example usage in main.js, after mapSystem is initialized:
// const spawn1 = new EnemySpawnPoint(0, Math.floor(this.mapSystem.gridHeight / 2), this.mapSystem);
// this.enemySpawns = [spawn1]; // Keep a list if needed by other systems
//
// In Game.draw() loop, after camera transformations and map drawing:
// this.enemySpawns.forEach(spawn => spawn.draw(this.ctx));
