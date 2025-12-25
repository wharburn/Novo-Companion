/**
 * Master Test Runner
 * Automatically finds and tests all audio files
 * Run with: node run-all-tests.mjs
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locations to search for audio files
const SEARCH_PATHS = [
  path.join(process.env.HOME, 'Downloads'),
  path.join(__dirname, 'test-audio'),
  __dirname
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           🎙️  MASTER AUDIO TEST RUNNER                   ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('🔍 Searching for audio files...');
console.log('');

// Find all WebM files
const audioFiles = [];

for (const searchPath of SEARCH_PATHS) {
  if (!fs.existsSync(searchPath)) continue;
  
  const files = fs.readdirSync(searchPath);
  for (const file of files) {
    if (file.endsWith('.webm') || file.endsWith('.ogg')) {
      const fullPath = path.join(searchPath, file);
      const stats = fs.statSync(fullPath);
      audioFiles.push({
        path: fullPath,
        name: file,
        size: stats.size
      });
    }
  }
}

if (audioFiles.length === 0) {
  console.log('❌ No audio files found!');
  console.log('');
  console.log('Please record audio files using one of these methods:');
  console.log('1. Open audio-test-suite.html and record audio');
  console.log('2. Place .webm files in ~/Downloads/');
  console.log('3. Place .webm files in novo-app/test-audio/');
  console.log('');
  process.exit(1);
}

console.log(`✅ Found ${audioFiles.length} audio file(s):`);
audioFiles.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
});
console.log('');

// Test results summary
const results = [];

// Run tests sequentially
async function runTests() {
  for (let i = 0; i < audioFiles.length; i++) {
    const file = audioFiles[i];
    
    console.log('═════════════════════════════════════════════════════════════');
    console.log(`TEST ${i + 1}/${audioFiles.length}: ${file.name}`);
    console.log('═════════════════════════════════════════════════════════════');
    console.log('');
    
    const result = await runSingleTest(file.path);
    results.push({
      file: file.name,
      ...result
    });
    
    console.log('');
    
    // Wait a bit between tests
    if (i < audioFiles.length - 1) {
      console.log('⏳ Waiting 3 seconds before next test...');
      console.log('');
      await sleep(3000);
    }
  }
  
  // Show summary
  showSummary();
}

function runSingleTest(filePath) {
  return new Promise((resolve) => {
    const child = spawn('node', ['auto-test-audio.mjs', filePath], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    const result = {
      success: false,
      exitCode: null
    };
    
    child.on('exit', (code) => {
      result.exitCode = code;
      result.success = code === 0;
      resolve(result);
    });
    
    child.on('error', (error) => {
      console.error('❌ Error running test:', error.message);
      resolve(result);
    });
  });
}

function showSummary() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 FINAL SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
  
  if (successful > 0) {
    console.log('✅ SUCCESSFUL TESTS:');
    results.filter(r => r.success).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.file}`);
    });
    console.log('');
  }
  
  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.file}`);
    });
    console.log('');
  }
  
  console.log('═════════════════════════════════════════════════════════════');
  console.log('');
  
  if (successful === 0) {
    console.log('🔍 NEXT STEPS:');
    console.log('');
    console.log('Since NO tests succeeded, the issue is likely:');
    console.log('1. Audio format incompatibility with Hume');
    console.log('2. Audio transmission method is incorrect');
    console.log('3. Server configuration issue');
    console.log('');
    console.log('Check the test-results-*.json files for detailed logs.');
  } else if (successful < results.length) {
    console.log('🔍 NEXT STEPS:');
    console.log('');
    console.log('Some tests succeeded! Compare successful vs failed files.');
    console.log('Check the test-results-*.json files for differences.');
  } else {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('Audio transcription is working correctly!');
  }
  
  console.log('');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run all tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

