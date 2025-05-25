class MunitionsManager {
    constructor(eventEmitter = null) {
        this.munitions = []; // Array of active munition instances
        this.eventEmitter = eventEmitter; // For future use, e.g., sound events

        // A simple factory for creating munitions based on type
        // Assumes munition classes (e.g., BasicBullet) are globally accessible or registered
        this.munitionFactory = {
            'BasicBullet': (config) => new BasicBullet(config),
            // Add other munition types here, e.g.:
            // 'LaserBeam': (config) => new LaserBeam(config),
            // 'SlowAura': (config) => new SlowAura(config),
        };
        // Allow registration of new munition types externally if needed
        // e.g., game.munitionsManager.registerMunitionType('Missile', MissileClass);

        console.log("MunitionsManager initialized.");
    }

    // Method to register new munition types with the factory
    registerMunitionType(typeName, constructor) {
        if (typeof typeName === 'string' && typeof constructor === 'function') {
            this.munitionFactory[typeName] = (config) => new constructor(config);
            console.log(`MunitionsManager: Registered new munition type "${typeName}".`);
        } else {
            console.error("MunitionsManager: Invalid typeName or constructor for munition type registration.");
        }
    }

    // Towers call this with a configuration object for the projectile
    addMunition(munitionConfig) {
        const munitionType = munitionConfig.type || 'BasicBullet'; // Default to BasicBullet if type not specified
        
        if (this.munitionFactory[munitionType]) {
            try {
                const newMunition = this.munitionFactory[munitionType](munitionConfig);
                this.munitions.push(newMunition);
            } catch (error) {
                console.error(`MunitionsManager: Error creating munition of type "${munitionType}":`, error, munitionConfig);
            }
        } else {
            console.error(`MunitionsManager: Unknown munition type "${munitionType}". Cannot create projectile.`);
        }
    }

    updateMunitions(dt) {
        for (let i = this.munitions.length - 1; i >= 0; i--) {
            const munition = this.munitions[i];
            munition.update(dt);
            if (!munition.isActive) {
                this.munitions.splice(i, 1); // Remove inactive munitions
            }
        }
    }

    drawMunitions(ctx) {
        for (const munition of this.munitions) {
            munition.draw(ctx);
        }
    }
    
    clearAllMunitions() {
        this.munitions = [];
    }
}

// Example usage in main.js:
// this.munitionsManager = new MunitionsManager(this.eventEmitter);
// // If BasicBullet isn't global, it needs to be registered:
// // this.munitionsManager.registerMunitionType('BasicBullet', BasicBullet); 
//
// In Game.update(): this.munitionsManager.updateMunitions(dt);
// In Game.draw(): this.munitionsManager.drawMunitions(this.ctx);
//
// When a tower shoots, it calls:
// this.munitionsManager.addMunition({
//   type: 'BasicBullet', // or other type
//   startX: this.x,
//   startY: this.y,
//   target: currentTarget,
//   /* ...other stats like speed, damage, radius, color */
// });

// Ensure munition classes like BasicBullet are loaded and accessible.
// If they are not global (e.g. using modules), they need to be explicitly registered.
// For current setup, assuming BasicBullet is on window scope or will be.
if (typeof BasicBullet !== 'undefined') {
    // This is a bit of a hack for non-module environments.
    // A better approach would be explicit registration in main.js after all classes are defined.
    // MunitionsManager.prototype.munitionFactory['BasicBullet'] = (config) => new BasicBullet(config);
} else {
    console.warn("MunitionsManager: BasicBullet class not found globally. Towers might not shoot correctly until it's registered.");
}
