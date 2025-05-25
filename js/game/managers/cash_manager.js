class CashManager {
    constructor(initialCash = 0, uiManager = null, eventEmitter = null) {
        this.cash = initialCash;
        this.uiManager = uiManager; // Optional: For updating UI directly
        this.eventEmitter = eventEmitter; // Optional: For emitting cash change events

        if (this.uiManager) {
            this.uiManager.updateCash(this.cash);
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit('cashChanged', { currentCash: this.cash });
        }
        console.log(`CashManager initialized with ${this.cash} cash.`);
    }

    getCurrentCash() {
        return this.cash;
    }

    addCash(amount) {
        if (amount <= 0) return;
        this.cash += amount;
        console.log(`Added ${amount} cash. Total: ${this.cash}`);
        if (this.uiManager) {
            this.uiManager.updateCash(this.cash);
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit('cashChanged', { currentCash: this.cash, amountAdded: amount });
        }
    }

    spendCash(amount) {
        if (amount <= 0) return false; // Cannot spend zero or negative
        if (this.cash >= amount) {
            this.cash -= amount;
            console.log(`Spent ${amount} cash. Remaining: ${this.cash}`);
            if (this.uiManager) {
                this.uiManager.updateCash(this.cash);
            }
            if (this.eventEmitter) {
                this.eventEmitter.emit('cashChanged', { currentCash: this.cash, amountSpent: amount });
            }
            return true;
        }
        console.warn(`Not enough cash to spend ${amount}. Current: ${this.cash}`);
        if (this.uiManager) {
            this.uiManager.showSnackbar("Not enough cash!", 3000); // TD-PLAN 4.9
        }
        return false;
    }

    hasEnoughCash(amount) {
        return this.cash >= amount;
    }

    setCash(amount) {
        this.cash = amount;
        console.log(`Cash set to ${this.cash}.`);
        if (this.uiManager) {
            this.uiManager.updateCash(this.cash);
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit('cashChanged', { currentCash: this.cash });
        }
    }
}

// Example usage in main.js:
// this.uiManager = new UIManager(); // Assuming UIManager is initialized
// this.cashManager = new CashManager(100, this.uiManager, this.eventEmitter);
//
// // To add cash (e.g., when an enemy is defeated)
// this.cashManager.addCash(10);
//
// // To spend cash (e.g., when placing a tower)
// if (this.cashManager.spendCash(50)) {
//   // Place tower
// }
