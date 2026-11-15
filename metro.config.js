// Expo per SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// La wasm di expo-sqlite è un asset, non un modulo risolvibile da Metro.
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer richiede COEP/COOP, anche in sviluppo.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;