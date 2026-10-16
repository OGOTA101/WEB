import type { Vec2 } from "./types";

export type InputState = {
  move: Vec2;
  fire: boolean;
};

export class SharedInput {
  state: InputState = { move: { x: 0, y: 0 }, fire: false };
  private keys = new Set<string>();
  private stickVector: Vec2 = { x: 0, y: 0 };

  constructor() {
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
      if (event.code === "Space") this.state.fire = true;
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      if (event.code === "Space") this.state.fire = false;
    });
  }

  setStick(vector: Vec2) {
    this.stickVector = vector;
  }

  setFire(fire: boolean) {
    this.state.fire = fire;
  }

  update() {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (Math.abs(this.stickVector.x) > 0.05 || Math.abs(this.stickVector.y) > 0.05) {
      x = this.stickVector.x;
      y = this.stickVector.y;
    }
    const length = Math.hypot(x, y);
    this.state.move = length > 1 ? { x: x / length, y: y / length } : { x, y };
  }
}
