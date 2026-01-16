import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()
function pathResolve(dir: string) {
  return resolve(root, '.', dir)
}

// https://vite.dev/config/
export default function ({ mode }: any) {
  const env = loadEnv(mode, root)
  return {
    plugins: [
      env.VITE_LIB === 'true' ? dts({
        tsconfigPath: "./tsconfig.app.json",
        rollupTypes: true,
        // copyDtsFiles: true
      }) : null,
      vue(), 
      tailwindcss()
    ],
    base: env.VITE_BASE_PATH,
    build: env.VITE_LIB === 'true' ? {
      lib: {
        entry: resolve(__dirname, env.VITE_ENTRY),
        fileName: 'index',
        formats: ["es"]
      },
      outDir: env.VITE_OUT_DIR,
      // assetsInlineLimit: 4096 * 1, // 默认 4096（4KB）
      minify: true,
      rollupOptions: {
        external: [],
        output : {
          chunkFileNames: "[name].js",
        },
        // 关闭某些优化
        // treeshake: {
        //   moduleSideEffects: true
        // }
      },
    } : {
      outDir: env.VITE_OUT_DIR || 'dist',
      sourcemap: env.VITE_SOURCEMAP === 'true',
    },
    resolve: {
      alias: [{
        find: /\@\//,
        replacement: `${pathResolve('src')}/`,
      }]
    },
    server: {
      host: "0.0.0.0",
      hmr: false
    }
  }
}
