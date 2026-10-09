import { defineConfig } from 'vite';
export default defineConfig({publicDir:'assets',build:{rollupOptions:{input:{game:'index.html',masks:'mask-editor.html'}}}});
