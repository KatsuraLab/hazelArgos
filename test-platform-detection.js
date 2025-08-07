#!/usr/bin/env node

/**
 * Test script for platform detection in modified Hazel
 * Tests that .dmg maps to darwin and .AppImage maps to linux
 */

const platform = require('./lib/platform');
const aliases = require('./lib/aliases');

const testFiles = [
  // macOS tests
  { file: 'Argos-Desktop-1.2.0.dmg', expected: 'darwin', description: 'macOS .dmg file' },
  { file: 'Argos-Desktop-1.2.0-arm64.dmg', expected: 'darwin_arm64', description: 'macOS ARM64 .dmg file' },
  { file: 'Argos-Desktop-1.2.0-mac.zip', expected: 'darwin', description: 'macOS .zip file' },
  
  // Linux tests
  { file: 'Argos-Desktop-1.2.0.AppImage', expected: 'linux', description: 'Linux .AppImage file' },
  { file: 'Argos-Desktop-1.2.0-arm64.AppImage', expected: 'linux_arm64', description: 'Linux ARM64 .AppImage file' },
  { file: 'argos-desktop_1.2.0_amd64.deb', expected: 'deb', description: 'Debian package' },
  { file: 'argos-desktop-1.2.0.x86_64.rpm', expected: 'rpm', description: 'RPM package' },
  
  // Windows tests
  { file: 'Argos-Desktop-Setup-1.2.0.exe', expected: 'win32', description: 'Windows .exe file' },
  { file: 'Argos-Desktop-1.2.0-win.exe', expected: 'win32', description: 'Windows installer' },
];

const aliasTests = [
  // Darwin aliases
  { alias: 'mac', expected: 'darwin', description: 'mac -> darwin' },
  { alias: 'macos', expected: 'darwin', description: 'macos -> darwin' },
  { alias: 'osx', expected: 'darwin', description: 'osx -> darwin' },
  { alias: 'dmg', expected: 'darwin', description: 'dmg -> darwin' },
  
  // Windows aliases
  { alias: 'windows', expected: 'win32', description: 'windows -> win32' },
  { alias: 'win', expected: 'win32', description: 'win -> win32' },
  { alias: 'exe', expected: 'exe', description: 'exe -> exe (kept for compatibility)' },
  
  // Linux aliases
  { alias: 'AppImage', expected: 'linux', description: 'AppImage -> linux' },
  { alias: 'appimage', expected: 'linux', description: 'appimage -> linux' },
];

console.log('=== Platform Detection Tests ===\n');

// Test platform detection
console.log('1. File Platform Detection:');
console.log('─'.repeat(50));

let passed = 0;
let failed = 0;

for (const test of testFiles) {
  const result = platform(test.file);
  const success = result === test.expected;
  
  if (success) {
    console.log(`✓ ${test.description}`);
    console.log(`  File: ${test.file}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    passed++;
  } else {
    console.log(`✗ ${test.description}`);
    console.log(`  File: ${test.file}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    failed++;
  }
  console.log();
}

// Test alias resolution
console.log('\n2. Alias Resolution:');
console.log('─'.repeat(50));

for (const test of aliasTests) {
  const result = aliases(test.alias);
  const success = result === test.expected;
  
  if (success) {
    console.log(`✓ ${test.description}`);
    console.log(`  Input: ${test.alias}, Output: ${result}`);
    passed++;
  } else {
    console.log(`✗ ${test.description}`);
    console.log(`  Input: ${test.alias}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    failed++;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed.');
  process.exit(1);
}