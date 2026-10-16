import * as THREE from 'three';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * WebGPU レンダラー生成
 * - WebGPU が使えればWebGPUバックエンド、使えなければ自動でWebGL2バックエンドに切り替わる
 * - PCFソフトシャドウ / ACESトーンマッピング
 */
export async function createRenderer(container) {
  const renderer = new THREE.WebGPURenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.0));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  await renderer.init();
  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2 (fallback)';
  return { renderer, backend };
}

/**
 * ポストプロセス：HDRシーン → ブルーム（発光ボクセル・弾・爆発が光る）→ トーンマップ
 */
export function createPost(renderer, scene, camera, { strength = 0.7, radius = 0.45, threshold = 0.72 } = {}) {
  const post = new THREE.PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  const bloomPass = bloom(color, strength, radius, threshold);
  post.outputNode = color.add(bloomPass);
  return { post, bloomPass };
}

/** 金属の映り込み用 環境マップ */
export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  return tex;
}
