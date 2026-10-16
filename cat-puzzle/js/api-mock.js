/**
 * api-mock.js
 * Mock Firebase/LocalStorage for standalone running
 */
const Storage = {
    KEY: 'neko_link_v1',
    load: () => {
        try {
            const d = localStorage.getItem(Storage.KEY);
            return d ? JSON.parse(d) : { highScore: 0 };
        } catch (e) { return { highScore: 0 }; }
    },
    save: (data) => {
        localStorage.setItem(Storage.KEY, JSON.stringify(data));
    }
};

const playSE = (name) => {
    // Placeholder for audio
    console.log('Play SE:', name);
};
