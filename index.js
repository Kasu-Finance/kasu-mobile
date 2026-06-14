// Custom entry: load crypto/text-encoding/url polyfills BEFORE anything else so
// ethers v5 and the Kasu SDK have a working `crypto.getRandomValues`, `Buffer`,
// `TextEncoder` and `URL` on React Native. Order matters — this file must run
// before `expo-router/entry` pulls in the app tree.
import './src/lib/web3/crypto-polyfills';
import 'expo-router/entry';
