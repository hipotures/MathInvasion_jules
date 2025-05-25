// Basic A* Node
class PathNode {
    constructor(x, y, parent = null, g = 0, h = 0) {
        this.x = x; // Grid x
        this.y = y; // Grid y
        this.parent = parent;
        this.g = g; // Cost from start to current node
        this.h = h; // Heuristic cost from current node to end
        this.f = g + h; // Total cost
    }

    equals(otherNode) {
        return this.x === otherNode.x && this.y === otherNode.y;
    }
}

class MapSystem {
    constructor(ctx, gridWidth, gridHeight, cellSize, eventEmitter = null) {
        if (!ctx) {
            throw new Error("MapSystem requires a rendering context (ctx).");
        }
        this.ctx = ctx;
        this.gridWidth = gridWidth; // Number of cells horizontally
        this.gridHeight = gridHeight; // Number of cells vertically
        this.cellSize = cellSize; // Size of each cell in pixels
        this.eventEmitter = eventEmitter;

        this.worldWidth = this.gridWidth * this.cellSize;
        this.worldHeight = this.gridHeight * this.cellSize;

        // Grid representation: 0 = empty, 1 = tower, 2 = obstacle, 3 = player base, 4 = enemy spawn
        this.grid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(0));
        
        this.pathCache = new Map(); // Cache for A* paths: key "startX,startY_endX,endY" -> path
        
        this.playerBase = null; // Will be an object like { x, y, entity }
        this.enemySpawns = []; // Array of objects like { x, y, entity }

        // Colors for drawing - these can be configured later
        this.colors = {
            gridLines: '#C0C0C0',
            obstacle: '#808080', // Grey
            playerBase: '#00FF00', // Green
            enemySpawn: '#FF0000', // Red
            emptyCell: '#EEEEEE', // Very light grey for empty cells (optional)
            path: 'rgba(0,0,255,0.3)', // For debugging paths
            blockedPlacement: 'rgba(255, 0, 0, 0.5)',
            validPlacement: 'rgba(0, 255, 0, 0.5)',
        };

        console.log(`MapSystem initialized: ${gridWidth}x${gridHeight} grid, ${cellSize}px cells.`);
    }

    // --- Grid Management ---
    getCellType(x, y) {
        if (this.isValidGridCoords(x, y)) {
            return this.grid[y][x];
        }
        return -1; // Out of bounds
    }

    setCellType(x, y, type) {
        if (this.isValidGridCoords(x, y)) {
            this.grid[y][x] = type;
            this.invalidatePathCache(); // Map structure changed
            if (this.eventEmitter) {
                this.eventEmitter.emit('mapChanged', { x, y, type });
            }
        }
    }

    isValidGridCoords(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    }

    isCellPassable(x, y, forEnemies = true) {
        if (!this.isValidGridCoords(x, y)) {
            return false;
        }
        const cellType = this.grid[y][x];
        // Enemies can pass through empty cells, player base, and enemy spawns.
        // They cannot pass through towers or obstacles.
        if (forEnemies) {
            return cellType === 0 || cellType === 3 || cellType === 4;
        }
        // For other purposes (e.g. tower placement), only empty cells might be considered "passable"
        return cellType === 0;
    }
    
    // --- Terrain Elements ---
    setPlayerBase(gridX, gridY, entity) {
        if (this.isValidGridCoords(gridX, gridY)) {
            this.playerBase = { x: gridX, y: gridY, entity: entity };
            this.setCellType(gridX, gridY, 3); // Type 3 for player base
            console.log(`Player base set at (${gridX}, ${gridY})`);
        } else {
            console.error("Invalid coordinates for player base.");
        }
    }

    getPlayerBaseCoords() {
        return this.playerBase ? { x: this.playerBase.x, y: this.playerBase.y } : null;
    }
    
    addEnemySpawn(gridX, gridY, entity) {
        if (this.isValidGridCoords(gridX, gridY)) {
            const spawn = { x: gridX, y: gridY, entity: entity };
            this.enemySpawns.push(spawn);
            this.setCellType(gridX, gridY, 4); // Type 4 for enemy spawn
            console.log(`Enemy spawn added at (${gridX}, ${gridY})`);
        } else {
            console.error("Invalid coordinates for enemy spawn.");
        }
    }

    getEnemySpawnCoords() {
        return this.enemySpawns.map(s => ({x: s.x, y: s.y}));
    }

    addObstacle(gridX, gridY, entity = null) { // Entity is optional for simple obstacles
        if (this.isValidGridCoords(gridX, gridY) && this.grid[gridY][gridX] === 0) {
            this.setCellType(gridX, gridY, 2); // Type 2 for obstacle
            console.log(`Obstacle added at (${gridX}, ${gridY})`);
            return true;
        }
        return false;
    }

    // --- Tower Placement ---
    canPlaceTower(gridX, gridY) {
        if (!this.isCellPassable(gridX, gridY, false)) { // Check if cell is empty
             console.debug(`Tower placement denied at (${gridX},${gridY}): Cell not empty (type ${this.getCellType(gridX,gridY)})`);
            return false;
        }

        // Temporarily place tower to check path blocking
        const originalCellType = this.grid[gridY][gridX];
        this.grid[gridY][gridX] = 1; // Simulate tower placement (type 1 for tower)

        let allPathsValid = true;
        if (!this.playerBase) { // Should not happen in a normal game setup
            console.error("Player base not set, cannot check tower placement.");
            this.grid[gridY][gridX] = originalCellType; // Revert
            return false;
        }

        for (const spawn of this.enemySpawns) {
            const path = this.findPath(spawn.x, spawn.y, this.playerBase.x, this.playerBase.y, true); // Force recalculate, ignore cache for this check
            if (!path || path.length === 0) {
                allPathsValid = false;
                break;
            }
        }
        
        // Also check if any existing enemies lose their path (TD-PLAN 4.6)
        // This requires access to EnemyManager, might be better handled by a game logic orchestrator
        // For now, focus on spawn-to-base paths.
        // if (allPathsValid && this.eventEmitter) {
        //     const pathCheckResult = { canPlace: true };
        //     this.eventEmitter.emit('requestEnemyPathValidation', pathCheckResult);
        //     if (!pathCheckResult.canPlace) allPathsValid = false;
        // }


        this.grid[gridY][gridX] = originalCellType; // Revert simulation
        if (!allPathsValid) console.debug(`Tower placement denied at (${gridX},${gridY}): Blocks path.`);
        return allPathsValid;
    }

    placeTower(gridX, gridY, towerEntity) {
        if (this.canPlaceTower(gridX, gridY)) {
            this.setCellType(gridX, gridY, 1); // Type 1 for tower
            // Store towerEntity if needed, or let another system manage it
            console.log(`Tower placed at (${gridX}, ${gridY})`);
            this.invalidatePathCache(); // Paths might change
            // Enemies should recalculate their paths:
            if(this.eventEmitter) this.eventEmitter.emit('mapStructureChanged');
            return true;
        }
        return false;
    }
    
    removeTower(gridX, gridY) {
        if (this.isValidGridCoords(gridX, gridY) && this.grid[gridY][gridX] === 1) {
            this.setCellType(gridX, gridY, 0); // Set back to empty
            this.invalidatePathCache();
            if(this.eventEmitter) this.eventEmitter.emit('mapStructureChanged');
            return true;
        }
        return false;
    }

    // --- Pathfinding (A*) ---
    invalidatePathCache() {
        this.pathCache.clear();
        // console.debug("MapSystem: Path cache invalidated.");
    }

    _heuristic(nodeA, nodeB) {
        // Manhattan distance
        return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
    }

    findPath(startX, startY, endX, endY, forceRecalculate = false) {
        const cacheKey = `${startX},${startY}_${endX},${endY}`;
        if (!forceRecalculate && this.pathCache.has(cacheKey)) {
            return this.pathCache.get(cacheKey);
        }

        const openSet = [];
        const closedSet = new Set(); // Using Set for faster lookups of "x,y" strings

        const startNode = new PathNode(startX, startY, null, 0, this._heuristic({x: startX, y: startY}, {x: endX, y: endY}));
        openSet.push(startNode);

        while (openSet.length > 0) {
            // Find node with lowest F score in openSet
            openSet.sort((a, b) => a.f - b.f);
            const currentNode = openSet.shift();

            if (currentNode.x === endX && currentNode.y === endY) {
                // Path found, reconstruct it
                const path = [];
                let temp = currentNode;
                while (temp) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                const finalPath = path.reverse();
                this.pathCache.set(cacheKey, finalPath);
                return finalPath;
            }

            closedSet.add(`${currentNode.x},${currentNode.y}`);

            // Get neighbors (up, down, left, right)
            const neighbors = [
                { x: currentNode.x, y: currentNode.y - 1 }, // Up
                { x: currentNode.x, y: currentNode.y + 1 }, // Down
                { x: currentNode.x - 1, y: currentNode.y }, // Left
                { x: currentNode.x + 1, y: currentNode.y }, // Right
            ];
            // Optional: Add diagonal neighbors
            // { x: currentNode.x - 1, y: currentNode.y - 1 }, // Top-Left
            // { x: currentNode.x + 1, y: currentNode.y - 1 }, // Top-Right
            // { x: currentNode.x - 1, y: currentNode.y + 1 }, // Bottom-Left
            // { x: currentNode.x + 1, y: currentNode.y + 1 }, // Bottom-Right


            for (const neighborPos of neighbors) {
                if (!this.isCellPassable(neighborPos.x, neighborPos.y) || closedSet.has(`${neighborPos.x},${neighborPos.y}`)) {
                    continue;
                }

                const gScore = currentNode.g + 1; // Cost to move to neighbor is 1
                let neighborNode = openSet.find(n => n.x === neighborPos.x && n.y === neighborPos.y);

                if (!neighborNode) { // Not in openSet yet
                    neighborNode = new PathNode(neighborPos.x, neighborPos.y, currentNode, gScore, this._heuristic(neighborPos, {x: endX, y: endY}));
                    openSet.push(neighborNode);
                } else if (gScore < neighborNode.g) { // Found a better path to this neighbor
                    neighborNode.parent = currentNode;
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                }
            }
        }
        // No path found
        this.pathCache.set(cacheKey, null); // Cache failure
        return null;
    }

    // --- Drawing ---
    drawGrid() {
        this.ctx.strokeStyle = this.colors.gridLines;
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.worldHeight);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.worldWidth, y * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawTerrain() {
        for (let r = 0; r < this.gridHeight; r++) {
            for (let c = 0; c < this.gridWidth; c++) {
                const cellType = this.grid[r][c];
                const worldX = c * this.cellSize;
                const worldY = r * this.cellSize;
                let color = null;

                switch (cellType) {
                    case 0: // Empty
                        // Optionally draw empty cells if they have a specific background
                        // if (this.colors.emptyCell) {
                        //     this.ctx.fillStyle = this.colors.emptyCell;
                        //     this.ctx.fillRect(worldX, worldY, this.cellSize, this.cellSize);
                        // }
                        break;
                    case 1: // Tower - Towers will draw themselves
                        break;
                    case 2: // Obstacle
                        this.ctx.fillStyle = this.colors.obstacle;
                        this.ctx.fillRect(worldX, worldY, this.cellSize, this.cellSize);
                        break;
                    case 3: // Player Base - PlayerBase entity will draw itself
                        break;
                    case 4: // Enemy Spawn - EnemySpawn entity will draw itself
                        break;
                }
            }
        }
        // Entities like PlayerBase, EnemySpawn will be drawn by their own draw methods
        // or by an entity manager. This function handles static terrain parts defined by cellType.
    }
    
    // For debugging A*
    drawPath(path) {
        if (!path || path.length === 0) return;
        this.ctx.fillStyle = this.colors.path;
        path.forEach(node => {
            this.ctx.fillRect(node.x * this.cellSize + this.cellSize / 4, 
                               node.y * this.cellSize + this.cellSize / 4, 
                               this.cellSize / 2, this.cellSize / 2);
        });
    }
    
    drawPlacementIndicator(gridX, gridY, canPlace) {
        const worldX = gridX * this.cellSize;
        const worldY = gridY * this.cellSize;
        this.ctx.fillStyle = canPlace ? this.colors.validPlacement : this.colors.blockedPlacement;
        this.ctx.fillRect(worldX, worldY, this.cellSize, this.cellSize);
    }

    // --- Coordinate Conversion ---
    worldToGrid(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.cellSize),
            y: Math.floor(worldY / this.cellSize)
        };
    }

    gridToWorld(gridX, gridY, centered = false) {
        if (centered) {
            return {
                x: gridX * this.cellSize + this.cellSize / 2,
                y: gridY * this.cellSize + this.cellSize / 2
            };
        }
        return {
            x: gridX * this.cellSize,
            y: gridY * this.cellSize
        };
    }
    
    update() {
        // Map system might not need per-frame updates unless it handles animations or dynamic terrain changes itself
    }
}

// Example Usage in main.js:
// this.mapSystem = new MapSystem(this.canvasSystem.getContext(), 20, 15, 40, this.eventEmitter); // 20x15 grid, 40px cells
// this.mapSystem.setPlayerBase(10, 7, somePlayerBaseEntity);
// this.mapSystem.addEnemySpawn(0, 7, someSpawnEntity);
// this.mapSystem.addObstacle(5,5);
//
// In Game.draw():
// this.mapSystem.drawGrid();
// this.mapSystem.drawTerrain();
// const path = this.mapSystem.findPath(0,7, 10,7);
// if (path) this.mapSystem.drawPath(path); // For debugging
