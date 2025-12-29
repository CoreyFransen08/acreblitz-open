import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      // Handle CSS module imports in type generation
      paths: {
        '*.module.css': ['./src/types/css.d.ts'],
      },
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  minify: false,
  // Handle CSS imports - bundle our module CSS, externalize library CSS
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      '.png': 'dataurl',
    };
  },
  // Don't bundle external CSS - consumers should import leaflet CSS separately
  noExternal: [],
});
