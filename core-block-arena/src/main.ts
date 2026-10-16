import Phaser from "phaser";
import "./style.css";
import { SharedInput } from "./game/input";
import { GameplayScene } from "./game/scenes/GameplayScene";
import { CoreBlockArenaSim } from "./game/simulation";
import { GameUi } from "./ui";
import { FirebaseRoomClient } from "./multiplayer/firebaseRoom";

const sim = new CoreBlockArenaSim();
const input = new SharedInput();
const online = new FirebaseRoomClient();

const scene = new GameplayScene(sim, input);
const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-root",
  backgroundColor: "#101724",
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [scene]
});

const ui = new GameUi({
  sim,
  input,
  online,
  onStart: (mode, name, room) => {
    sim.command({ type: "start", mode, playerName: name, room });
  }
});

let onlineSyncing = false;
window.setInterval(() => {
  const snapshot = sim.snapshot();
  ui.setSnapshot(snapshot);
  if (!onlineSyncing) {
    onlineSyncing = true;
    void online
      .syncSnapshot(snapshot)
      .then((remotePlayers) => sim.setRemotePlayers(remotePlayers))
      .finally(() => {
        onlineSyncing = false;
      });
  }
}, 350);

online.configure().then((status) => ui.setOnlineStatus(status));

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
