/**
 * data.js
 * Holds storage logic and data migration for the new accessory system.
 */

class StorageManager {
    static KEY = 'starry_cat_save_v2'; // Version bump to force migration logic check

    static load() {
        try {
            // Check v2 save first
            const raw = localStorage.getItem(this.KEY);
            if (raw) return JSON.parse(raw);

            // Check v1 save (migration)
            const oldRaw = localStorage.getItem('starry_cat_save_v1');
            if (oldRaw) {
                const oldData = JSON.parse(oldRaw);
                // Migrate: Convert old stars, discard old items but give bonus stars
                const bonus = (oldData.inventory ? oldData.inventory.length * 100 : 0);
                const newData = this.getDefaultHeader();
                newData.stars = (oldData.stars || 0) + bonus;
                if (oldData.highScore) newData.highScore = oldData.highScore;

                // Save new data immediately
                this.save(newData);
                return newData;
            }

        } catch (e) {
            console.error('Save load failed', e);
        }
        return this.getDefaultHeader();
    }

    static save(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Save failed', e);
        }
    }

    static getDefaultHeader() {
        return {
            stars: 500, // Initial bonus for gacha
            highScore: 0,

            // New Inventory Structure: Array of Item Objects
            // { uid: string, baseId: string, effects: [string, string], name: string }
            inventory: [],

            // New Equipment Structure: Single UID or null
            equippedId: null,

            settings: {
                bgm: true,
                se: true
            }
        };
    }
}
