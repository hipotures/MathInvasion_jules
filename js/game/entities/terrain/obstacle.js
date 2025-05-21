class Obstacle {
    constructor(gridX, gridY, mapSystem) {
        if (!mapSystem) {
            throw new Error("Obstacle requires a MapSystem instance.");
        }
        this.mapSystem = mapSystem;
        this.gridX = gridX;
        this.gridY = gridY;

        const worldPos = this.mapSystem.gridToWorld(this.gridX, this.gridY);
        this.x = worldPos.x; // World x coordinate (top-left of cell)
        this.y = worldPos.y; // World y coordinate (top-left of cell)
        this.width = this.mapSystem.cellSize;
        this.height = this.mapSystem.cellSize;

        this.color = '#A9A9A9'; // DarkGray for obstacles (rocks)
        this.borderColor = '#696969'; // DimGray

        // Register with the map system
        // The map system's addObstacle method already sets the cell type.
        // This entity is more for if obstacles need individual behavior or more complex drawing.
        const success = this.mapSystem.addObstacle(this.gridX, this.gridY, this);
        if (success) {
            console.log(`Obstacle entity created at grid (${this.gridX}, ${this.gridY})`);
        } else {
            console.warn(`Failed to create Obstacle entity at grid (${this.gridX}, ${this.gridY}) - cell might be occupied or invalid.`);
            // Potentially throw an error or handle this state
        }
    }

    // The MapSystem's drawTerrain method already draws obstacles based on cell type.
    // This draw method can be used if a more detailed or specific look is needed
    // for this obstacle instance, beyond the generic MapSystem rendering.
    draw(ctx) {
        // Main obstacle color
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 1; // Thinner border for obstacles
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Optional: Add some texture or detail to make it look like a rock/obstacle
        ctx.fillStyle = this.borderColor; // Use border color for some shading/dots
        for (let i = 0; i < 3; i++) { // Add a few "spots"
            ctx.beginPath();
            const spotX = this.x + Math.random() * this.width * 0.8 + this.width * 0.1;
            const spotY = this.y + Math.random() * this.height * 0.8 + this.height * 0.1;
            const spotRadius = Math.random() * this.width * 0.05 + this.width * 0.05;
            ctx.arc(spotX, spotY, spotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    update(dt) {
        // Obstacles are generally static
    }
}

// Example usage in main.js, after mapSystem is initialized:
// const obstacle1 = new Obstacle(3, 3, this.mapSystem);
// const obstacle2 = new Obstacle(3, 4, this.mapSystem);
// this.obstacles = [obstacle1, obstacle2]; // Keep a list if needed
//
// In Game.draw() loop, after camera transformations and map drawing:
// (Only if MapSystem doesn't draw them sufficiently or they have unique details)
// this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
