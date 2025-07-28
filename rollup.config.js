import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import inject from '@rollup/plugin-inject'
import * as path from 'path';

export default {
  input: ['src/main.js'],
  moduleContext: false,
  output: {
    dir: 'dist',
    format: 'es',
    manualChunks: function manualChunks(id) {
      if (id.includes('node_modules')) {
        return 'vendors'
      }
    },
    //intro: 'import crypto from "crypto";'
  },
  plugins: [
    // Use the Node resolution algorithm
    resolve({ preferBuiltins: false, browser: true }),
    // Convert CommonJS modules to ES Modules
    commonjs({ transformMixedEsModules: true }),
    inject({
      'crypto': ['crypto', 'crypto'],
      'pem2ab': ['crypto', 'pem2ab'],
      'atob': ['encoding', 'atob'],
      'btoa': ['encoding', 'btoa'],
      'URLSearchParams': 'url-search-params',
      'URL': ["url-polyfill/do-not-use/url.js", "URL"],
    }),
  ],
  // modules provided by Akamai EdgeWorkers environment
  external: ['url-search-params', 'cookies', 'log', 'http-request', 'crypto', 'encoding'],
}