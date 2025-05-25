class EventEmitter {
    constructor() {
        this.events = {};
        if (EventEmitter.instance) {
            // This is a simple way to ensure it's a singleton if desired,
            // but for this use case, multiple instances are fine.
            // return EventEmitter.instance; 
        }
        // EventEmitter.instance = this;
    }

    on(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
    }

    emit(eventName, ...args) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(listener => {
                try {
                    listener.apply(null, args);
                } catch (error) {
                    console.error(`Error in EventEmitter listener for event "${eventName}":`, error);
                }
            });
        }
    }

    off(eventName, listenerToRemove) {
        if (!this.events[eventName]) {
            return;
        }
        this.events[eventName] = this.events[eventName].filter(listener => listener !== listenerToRemove);
    }

    once(eventName, listener) {
        const onceWrapper = (...args) => {
            listener.apply(null, args);
            this.off(eventName, onceWrapper);
        };
        this.on(eventName, onceWrapper);
    }
}

// Export if using modules, otherwise it's global in browser script includes
// export default EventEmitter; 
// For current script tag setup, it will be globally available.
