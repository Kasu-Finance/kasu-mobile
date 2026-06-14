// RN crypto + encoding polyfills required by ethers v5 and @kasufinance/kasu-sdk.
// Imported first from `index.js`. See plan "Key risks → RN crypto polyfills".
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';
import '@ethersproject/shims';
