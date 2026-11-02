const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order (root first to guarantee singletons)
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];

// 3. Resolve .cjs files for Firebase modular SDK
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// 4. Force singleton resolution to avoid duplicate instances in monorepo
config.resolver.extraNodeModules = {
  firebase: path.resolve(monorepoRoot, 'node_modules/firebase'),
  '@firebase/app': path.resolve(monorepoRoot, 'node_modules/@firebase/app'),
  '@firebase/auth': path.resolve(monorepoRoot, 'node_modules/@firebase/auth'),
  '@firebase/component': path.resolve(monorepoRoot, 'node_modules/@firebase/component'),
  '@firebase/firestore': path.resolve(monorepoRoot, 'node_modules/@firebase/firestore'),
  '@react-native-async-storage/async-storage': path.resolve(
    monorepoRoot,
    'node_modules/@react-native-async-storage/async-storage'
  ),
};

module.exports = config;
