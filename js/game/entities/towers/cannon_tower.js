class CannonTower {
    constructor(mapSystem, enemyManager, munitionsManager, gridX, gridY) {
        if (!mapSystem || !enemyManager || !munitionsManager) {
            throw new Error("CannonTower requires MapSystem, EnemyManager, and MunitionsManager.");
        }
        this.mapSystem = mapSystem;
        this.enemyManager = enemyManager;
        this.munitionsManager = munitionsManager; // To create projectiles

        this.gridX = gridX;
        this.gridY = gridY;
        const worldPos = this.mapSystem.gridToWorld(gridX, gridY, true); // Center of the cell
        this.x = worldPos.x;
        this.y = worldPos.y;
        
        this.width = this.mapSystem.cellSize; // Occupies one cell
        this.height = this.mapSystem.cellSize;

        // Tower Stats (TD-PLAN 5.1)
        this.cost = 50; // Example cost
        this.range = this.mapSystem.cellSize * 2.5; // Range in pixels
        this.reloadTime = 1.0; // Seconds per shot (Gatling would be much lower)
        this.damage = 15; // Damage per shot
        this.projectileSpeed = 300; // Pixels per second
        this.projectileRadius = 3;
        this.projectileColor = '#FFA500'; // Orange

        this.name = "Cannon Tower";
        this.description = "A basic, reliable cannon tower.";

        // State
        this.currentTarget = null;
        this.timeToNextShot = 0; // Countdown for reloading
        this.turretAngle = 0; // For drawing the turret facing the target

        // Visuals
        this.baseColor = '#607D8B'; // Blue Grey
        this.turretColor = '#455A64'; // Darker Blue Grey
        this.turretLength = this.mapSystem.cellSize * 0.4;
        this.turretWidth = this.mapSystem.cellSize * 0.2;
        
        // Register on map - this is done by TowerPlacementSystem usually
        // this.mapSystem.placeTower(gridX, gridY, this); 
        // For now, assume it's placed. The TowerPlacementSystem will handle this.

        console.log(`CannonTower created at grid (${gridX}, ${gridY})`);
    }

    findTarget() {
        this.currentTarget = this.enemyManager.findNearestEnemy({ x: this.x, y: this.y }, this.range);
    }

    update(dt) {
        this.timeToNextShot = Math.max(0, this.timeToNextShot - dt);

        if (this.currentTarget && (!this.currentTarget.isActive || this._distanceToTarget(this.currentTarget) > this.range)) {
            this.currentTarget = null; // Target lost or out of range
        }

        if (!this.currentTarget) {
            this.findTarget();
        }

        if (this.currentTarget) {
            // Aim turret
            const dx = this.currentTarget.x - this.x;
            const dy = this.currentTarget.y - this.y;
            this.turretAngle = Math.atan2(dy, dx);

            if (this.timeToNextShot <= 0) {
                this.shoot();
                this.timeToNextShot = this.reloadTime;
            }
        } else {
            // No target, maybe slowly rotate turret or set to default angle
            // this.turretAngle += 0.005; // Slow rotation
        }
    }

    _distanceToTarget(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    shoot() {
        if (!this.currentTarget) return;

        console.log(`${this.name} shooting at target.`);
        // Create a projectile (TD-PLAN 5.1 - Kanon/Gatling creates BasicBullet)
        // We'll need a BasicBullet class later. For now, let's imagine MunitionsManager handles it.
        
        // MunitionsManager expects a projectile config or instance
        const projectileConfig = {
            startX: this.x,
            startY: this.y,
            target: this.currentTarget,
            speed: this.projectileSpeed,
            damage: this.damage,
            radius: this.projectileRadius,
            color: this.projectileColor,
            type: 'BasicBullet' // So MunitionsManager can instantiate the correct class
        };
        this.munitionsManager.addMunition(projectileConfig);
    }

    draw(ctx, isSelected = false, isHovered = false) {
        const cellX = this.gridX * this.mapSystem.cellSize;
        const cellY = this.gridY * this.mapSystem.cellSize;

        // Draw base
        ctx.fillStyle = this.baseColor;
        ctx.fillRect(cellX, cellY, this.width, this.height);
        ctx.strokeStyle = '#37474F';
        ctx.strokeRect(cellX, cellY, this.width, this.height);
        
        // Draw turret mount (a circle in the center)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = this.turretColor;
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.stroke();

        // Draw turret barrel
        ctx.save();
        ctx.translate(this.x, this.y); // Move origin to tower center
        ctx.rotate(this.turretAngle);
        
        ctx.fillStyle = this.turretColor;
        ctx.fillRect(0, -this.turretWidth / 2, this.turretLength, this.turretWidth);
        ctx.strokeStyle = '#263238';
        ctx.strokeRect(0, -this.turretWidth / 2, this.turretLength, this.turretWidth);
        
        ctx.restore();

        // Draw range circle if selected or hovered (TD-PLAN 5.1 & 4.9)
        if (isSelected || isHovered) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
            ctx.fill();
        }
    }
    
    // Required by MapSystem for placing on grid
    getGridPosition() {
        return { x: this.gridX, y: this.gridY };
    }
    
    // For UI display
    getStats() {
        return {
            name: this.name,
            cost: this.cost,
            damage: this.damage,
            range: this.range,
            reload: this.reloadTime,
            description: this.description,
            dps: (this.damage / this.reloadTime).toFixed(1)
        };
    }
}

// To make it accessible for TowerPlacementSystem or UIManager to get stats
// window.TowerTypes = window.TowerTypes || {};
// window.TowerTypes.CannonTower = CannonTower;

// Example in main.js/TowerPlacementSystem:
// const tower = new CannonTower(this.mapSystem, this.enemyManager, this.munitionsManager, gridX, gridY);
// this.towers.push(tower); // Manage list of towers
//
// In Game.update(): towers.forEach(t => t.update(dt));
// In Game.draw(): towers.forEach(t => t.draw(this.ctx));
