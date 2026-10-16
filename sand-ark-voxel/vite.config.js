import { defineConfig } from 'vite';

/**
 * WebGPU 対応：
 * 'three' を WebGPU ビルド（three/webgpu）へ差し替える。
 * addons（BloomNode / RoomEnvironment など）も同じビルドを参照するので、
 * クラスの二重定義が起きず、ノードマテリアル＋WebGPURenderer で統一される。
 * WebGPU 非対応ブラウザでは WebGPURenderer が自動で WebGL2 バックエンドへフォールバックする。
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^three$/, replacement: 'three/webgpu' }],
    dedupe: ['three']
  },
  optimizeDeps: {
    include: ['three/webgpu', 'three/tsl', 'peerjs']
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000
  }
});
