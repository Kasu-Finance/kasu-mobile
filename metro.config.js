// Metro config tuned for @privy-io/expo + @kasufinance/kasu-sdk.
//
// Privy's `jose` dependency ships separate node/browser builds; without package
// exports + the right condition order Metro picks jose's Node build, which
// imports the node `crypto` module and breaks the bundle. Preferring
// `react-native`/`browser` resolves jose's WebCrypto build instead.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require'];

module.exports = config;
