class BasicBullet {
    constructor(config) {
        // Config properties: startX, startY, target (enemy instance), speed, damage, radius, color
        if (!config.target || typeof config.startX !== 'number' || typeof config.startY !== 'number') {
            throw new Error("BasicBullet requires a target and start coordinates in config.");
        }
        this.x = config.startX;
        this.y = config.startY;
        this.target = config.target; // Reference to the enemy instance

        this.speed = config.speed || 200; // Pixels per second
        this.damage = config.damage || 10;
        this.radius = config.radius || 3; // For drawing and collision
        this.color = config.color || 'yellow';
        
        this.isActive = true; // Becomes false on hit or if target is lost

        console.log(`BasicBullet created at (${this.x}, ${this.y}) targeting enemy.`);
    }

    update(dt) {
        if (!this.isActive) return;

        // Check if target is still valid
        if (!this.target || !this.target.isActive) {
            this.isActive = false; // Target lost (e.g., died before impact)
            console.log("BasicBullet: Target lost, deactivating.");
            return;
        }

        // Move towards target's current position
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        if (distanceToTarget < this.radius + (this.target.radius || 0)) { // Hit condition (simple radius check)
            this.onHit();
            return;
        }
        
        // More precise hit detection for fast bullets / low frame rates
        if (distanceToTarget < this.speed * dt) { // Will reach or pass target this frame
             this.x = this.target.x; // Snap to target for hit registration
             this.y = this.target.y;
             this.onHit();
             return;
        }


        // Normalize direction vector and move
        this.x += (dx / distanceToTarget) * this.speed * dt;
        this.y += (dy / distanceToTarget) * this.speed * dt;
    }

    onHit() {
        this.isActive = false;
        if (this.target && this.target.isActive && typeof this.target.takeDamage === 'function') {
            this.target.takeDamage(this.damage);
            console.log(`BasicBullet hit target, dealing ${this.damage} damage.`);
        } else {
            console.log("BasicBullet: Hit, but target was already inactive or couldn't take damage.");
        }
        // Could emit an event here for particle effects on impact
    }

    draw(ctx) {
        if (!this.isActive) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Optional: add a border or a trail effect later
        // ctx.strokeStyle = 'darkorange';
        // ctx.stroke();
    }
}

// To make it accessible for MunitionsManager
// window.MunitionTypes = window.MunitionTypes || {};
// window.MunitionTypes.BasicBullet = BasicBullet;

// Example usage (typically by MunitionsManager based on tower's projectileConfig):
// const bullet = new BasicBullet({
//     startX: tower.x,
//     startY: tower.y,
//     target: currentEnemyTarget,
//     speed: tower.projectileSpeed,
//     damage: tower.damage,
//     radius: tower.projectileRadius,
//     color: tower.projectileColor
// });
// munitionsManager.munitions.push(bullet); // Manager would handle adding
