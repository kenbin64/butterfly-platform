// tests/polyfills.js
// Runs via jest `setupFiles` BEFORE the test environment and setup.ts load.
// Polyfills Web APIs that jsdom / whatwg-url expect to find on the global scope
// but that are not automatically forwarded from Node.js into the jest environment.

const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

