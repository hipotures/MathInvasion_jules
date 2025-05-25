class UIManager {
    constructor(eventEmitter = null) {
        this.eventEmitter = eventEmitter;

        // Cache references to UI elements (from index.html)
        this.cashAmountEl = document.getElementById('cash-amount');
        this.waveNumberEl = document.getElementById('wave-number');
        this.waveTimerEl = document.getElementById('wave-timer');
        this.baseHpEl = document.getElementById('base-hp');

        this.towerSelectionPanelEl = document.getElementById('tower-selection-panel');
        this.towerStatsPanelEl = document.getElementById('tower-stats-panel');
        this.towerNameEl = document.getElementById('tower-name');
        this.towerCostEl = document.getElementById('tower-cost');
        this.towerDamageEl = document.getElementById('tower-damage');
        this.towerRangeEl = document.getElementById('tower-range');
        this.towerDescriptionEl = document.getElementById('tower-description');
        
        this.gameOverScreenEl = document.getElementById('game-over-screen');
        this.snackbarEl = document.getElementById('snackbar');
        this.gameVersionEl = document.getElementById('game-version'); // Example: to set from package.json
        
        this.difficultyButtons = document.querySelectorAll('#difficulty-selection button');
        this.currentDifficultyEl = document.getElementById('current-difficulty');

        this._snackbarTimeout = null;

        this._initEventListeners();
        console.log("UIManager initialized.");
    }

    _initEventListeners() {
        // Event listeners for UI elements, e.g., tower selection buttons
        // These buttons will be created dynamically by addTowerToSelection
        
        // Difficulty buttons
        this.difficultyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const difficulty = e.target.dataset.difficulty;
                if (this.eventEmitter) {
                    this.eventEmitter.emit('difficultySelected', difficulty);
                }
                this.updateActiveDifficultyButton(e.target.textContent, e.target);
            });
        });

        // Listen for game events that require UI updates
        if (this.eventEmitter) {
            this.eventEmitter.on('cashChanged', (data) => this.updateCash(data.currentCash));
            this.eventEmitter.on('waveStarted', (data) => {
                this.updateWaveNumber(data.waveNumber);
                this.updateWaveTimer("Spawning...");
            });
            this.eventEmitter.on('playerBaseHpChanged', (data) => this.updateBaseHp(data.currentHp, data.maxHp));
            this.eventEmitter.on('playerBaseDestroyed', () => this.showGameOverScreen());
            
            // TD-PLAN 4.10: "stałe powiadomienie, gdy okno gry traci focus"
            this.eventEmitter.on('focusout', () => this.showSnackbar("Game Paused - Click to Resume", 0, true)); // 0 = permanent, true = isPauseNotification
            this.eventEmitter.on('focusin', () => this.hideSnackbar(true)); // true = only hide if it's a pause notification
        }
    }

    updateCash(amount) {
        if (this.cashAmountEl) this.cashAmountEl.textContent = Math.floor(amount);
    }

    updateWaveNumber(number) {
        if (this.waveNumberEl) this.waveNumberEl.textContent = number;
    }

    updateWaveTimer(time) {
        if (this.waveTimerEl) {
            if (typeof time === 'number') {
                this.waveTimerEl.textContent = Math.ceil(time) > 0 ? Math.ceil(time) + 's' : 'Spawning...';
            } else {
                this.waveTimerEl.textContent = time; // For text like "Waiting..." or "All Waves Sent!"
            }
        }
    }
    
    updateBaseHp(currentHp, maxHp) {
        if (this.baseHpEl) this.baseHpEl.textContent = `${currentHp} / ${maxHp}`;
    }

    // --- Tower Selection and Stats ---
    addTowerToSelection(typeName, stats) {
        if (!this.towerSelectionPanelEl || !this.eventEmitter) return;

        const button = document.createElement('button');
        // Display basic info: Name, Cost. Could be an image/icon too.
        button.innerHTML = `${stats.name || typeName}<br>($${stats.cost || '?'})`;
        button.title = `${stats.description || typeName}
Cost: ${stats.cost}
Damage: ${stats.damage}
Range: ${stats.range}`;
        button.dataset.towerType = typeName;
        
        button.addEventListener('click', () => {
            this.eventEmitter.emit('selectTowerType', typeName);
            // Highlight selected button (optional)
            this.towerSelectionPanelEl.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
        });
        
        this.towerSelectionPanelEl.appendChild(button);
    }
    
    updateTowerStatsPanel(stats) {
        if (!this.towerStatsPanelEl) return;
        if (stats) {
            this.towerNameEl.textContent = stats.name || '-';
            this.towerCostEl.textContent = stats.cost !== undefined ? `$${stats.cost}` : '-';
            this.towerDamageEl.textContent = stats.damage !== undefined ? `${stats.damage} (DPS: ${stats.dps || 'N/A'})` : '-';
            this.towerRangeEl.textContent = stats.range || '-';
            this.towerDescriptionEl.textContent = stats.description || '-';
            this.towerStatsPanelEl.style.display = 'block';
        } else {
            this.clearTowerStatsPanel();
        }
    }

    clearTowerStatsPanel() {
        if (this.towerStatsPanelEl) {
            this.towerNameEl.textContent = '-';
            this.towerCostEl.textContent = '-';
            this.towerDamageEl.textContent = '-';
            this.towerRangeEl.textContent = '-';
            this.towerDescriptionEl.textContent = '-';
            // this.towerStatsPanelEl.style.display = 'none'; // Or keep it visible but empty
        }
    }

    // --- Game Over Screen ---
    showGameOverScreen() {
        if (this.gameOverScreenEl) {
            this.gameOverScreenEl.style.display = 'block';
            // Could add a button to restart the game, emitting an event
        }
    }

    hideGameOverScreen() {
        if (this.gameOverScreenEl) {
            this.gameOverScreenEl.style.display = 'none';
        }
    }

    // --- Snackbar Notifications (TD-PLAN 4.10) ---
    showSnackbar(message, duration = 3000, isPauseRelated = false) {
        if (!this.snackbarEl) return;

        if (this._snackbarTimeout) {
            clearTimeout(this._snackbarTimeout);
            this._snackbarTimeout = null;
        }
        
        this.snackbarEl.textContent = message;
        this.snackbarEl.classList.add('show');
        this.snackbarEl.dataset.isPauseRelated = isPauseRelated.toString();

        if (duration > 0) { // Duration 0 means permanent until explicitly hidden
            this._snackbarTimeout = setTimeout(() => {
                this.hideSnackbar();
            }, duration);
        }
    }

    hideSnackbar(isPauseRelatedHiding = false) {
        if (!this.snackbarEl) return;
        // Only hide if it's not a pause-related message being hidden by focus gain,
        // OR if it's a generic hide call.
        if (isPauseRelatedHiding && this.snackbarEl.dataset.isPauseRelated !== "true") {
            return; // Don't hide non-pause snackbars on focus gain
        }

        this.snackbarEl.classList.remove('show');
        if (this._snackbarTimeout) {
            clearTimeout(this._snackbarTimeout);
            this._snackbarTimeout = null;
        }
        this.snackbarEl.dataset.isPauseRelated = "false";
    }
    
    // --- Difficulty ---
    updateActiveDifficultyButton(difficultyName, clickedButton = null) {
        if (this.currentDifficultyEl) this.currentDifficultyEl.textContent = difficultyName;
        this.difficultyButtons.forEach(btn => btn.classList.remove('active'));
        if (clickedButton) {
            clickedButton.classList.add('active');
        } else {
            // Find button by name if not directly passed
            this.difficultyButtons.forEach(btn => {
                if (btn.textContent.toLowerCase().includes(difficultyName.toLowerCase().split(" ")[0])) {
                    btn.classList.add('active');
                }
            });
        }
    }

    // --- Version ---
    setGameVersion(version) {
        if (this.gameVersionEl) this.gameVersionEl.textContent = version;
    }
}

// Example Usage (in main.js):
// this.uiManager = new UIManager(this.eventEmitter);
// this.uiManager.setGameVersion("0.1.0-alpha"); // Example
// this.uiManager.updateCash(initialCash);
// this.uiManager.updateWaveNumber(0);
// this.uiManager.updateWaveTimer("Starting...");
//
// When a tower type is registered with TowerPlacementSystem:
// towerPlacementSystem.registerTowerType('CannonTower', CannonTower, CannonTower.getStats());
// The TowerPlacementSystem would then call:
// uiManager.addTowerToSelection('CannonTower', CannonTower.getStats());
//
// When player selects a tower from UI, UIManager emits 'selectTowerType'
// TowerPlacementSystem listens to this and updates stats panel:
// uiManager.updateTowerStatsPanel(selectedTowerStats);
