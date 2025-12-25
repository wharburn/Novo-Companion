/**
 * Automated Audio Testing Script
 * This script will test audio with Hume and output results to console
 * Run with: node auto-test-audio.mjs <path-to-webm-file>
 */

import fs from 'fs';
import WebSocket from 'ws';

// Configuration
const HUME_WS_URL = 'ws://localhost:3000/api/hume/ws?userId=auto-test';
const TEST_AUDIO_FILE = process.argv[2];

if (!TEST_AUDIO_FILE) {
  console.error('❌ Usage: node auto-test-audio.mjs <path-to-webm-file>');
  process.exit(1);
}

if (!fs.existsSync(TEST_AUDIO_FILE)) {
  console.error(`❌ File not found: ${TEST_AUDIO_FILE}`);
  process.exit(1);
}

// Statistics
const stats = {
  userMessages: 0,
  assistantMessages: 0,
  errors: 0,
  audioOutputs: 0,
  startTime: Date.now(),
  transcriptions: [],
  errorMessages: [],
  allMessages: [],
};

// Test results
let testComplete = false;
let ws = null;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         🎙️  AUTOMATED AUDIO TEST - HUME EVI              ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📁 Audio File: ${TEST_AUDIO_FILE}`);
console.log(`📊 File Size: ${(fs.statSync(TEST_AUDIO_FILE).size / 1024).toFixed(2)} KB`);
console.log('');
console.log('🔌 Connecting to Hume...');
console.log('');

// Connect to Hume
ws = new WebSocket(HUME_WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to Hume EVI');
  console.log('');

  // Read audio file
  const audioBuffer = fs.readFileSync(TEST_AUDIO_FILE);
  const base64Audio = audioBuffer.toString('base64');

  console.log(`📤 Sending audio (${(base64Audio.length / 1024).toFixed(2)} KB base64)...`);
  console.log('');

  // Send as single message
  const message = {
    type: 'audio_input',
    data: base64Audio,
  };

  ws.send(JSON.stringify(message));
  console.log('✅ Audio sent successfully');
  console.log('⏳ Waiting for Hume response...');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    const timestamp = new Date().toLocaleTimeString();

    // Store all messages
    stats.allMessages.push({ timestamp, type: message.type, data: message });

    // Log all messages
    console.log(`[${timestamp}] 📥 ${message.type}`);

    // Handle specific message types
    if (message.type === 'user_message') {
      stats.userMessages++;
      const transcription = message.message?.content || 'N/A';
      stats.transcriptions.push(transcription);
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    ✅ TRANSCRIPTION SUCCESS!               ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`🎤 USER SAID: "${transcription}"`);
      console.log('');
    } else if (message.type === 'assistant_message') {
      stats.assistantMessages++;
      const response = message.message?.content || 'N/A';
      console.log(`   🤖 Assistant: "${response}"`);
    } else if (message.type === 'error') {
      stats.errors++;
      stats.errorMessages.push({
        code: message.code,
        message: message.message,
        slug: message.slug,
      });
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                        ❌ ERROR                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`   Code: ${message.code}`);
      console.log(`   Slug: ${message.slug}`);
      console.log(`   Message: ${message.message}`);
      console.log('');
    } else if (message.type === 'audio_output') {
      stats.audioOutputs++;
    } else if (message.type === 'assistant_end') {
      // Assistant finished speaking, wait a bit then show results
      setTimeout(() => {
        if (!testComplete) {
          showResults();
        }
      }, 2000);
    }
  } catch (e) {
    // Binary data
    console.log(`[${new Date().toLocaleTimeString()}] 📥 Binary audio data`);
  }
});

ws.on('error', (error) => {
  console.error('');
  console.error('❌ WebSocket Error:', error.message);
  console.error('');
  showResults();
});

ws.on('close', () => {
  console.log('');
  console.log('🔌 Disconnected from Hume');
  console.log('');
  if (!testComplete) {
    showResults();
  }
});

function showResults() {
  if (testComplete) return;
  testComplete = true;

  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  console.log('');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('                      📊 TEST RESULTS                        ');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🎤 User Messages (Transcriptions): ${stats.userMessages}`);
  console.log(`🤖 Assistant Messages: ${stats.assistantMessages}`);
  console.log(`🔊 Audio Outputs: ${stats.audioOutputs}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📨 Total Messages: ${stats.allMessages.length}`);
  console.log('');

  if (stats.transcriptions.length > 0) {
    console.log('✅ TRANSCRIPTIONS RECEIVED:');
    stats.transcriptions.forEach((t, i) => {
      console.log(`   ${i + 1}. "${t}"`);
    });
    console.log('');
  } else {
    console.log('❌ NO TRANSCRIPTIONS RECEIVED');
    console.log('   This means Hume did not recognize any speech in the audio.');
    console.log('');
  }

  if (stats.errorMessages.length > 0) {
    console.log('❌ ERRORS:');
    stats.errorMessages.forEach((e, i) => {
      console.log(`   ${i + 1}. [${e.code}] ${e.message}`);
    });
    console.log('');
  }

  console.log('═════════════════════════════════════════════════════════════');
  console.log('');

  // Diagnosis
  console.log('🔍 DIAGNOSIS:');
  console.log('');

  if (stats.userMessages > 0) {
    console.log('✅ SUCCESS! Audio is being transcribed correctly.');
    console.log('   The audio format and transmission method are working.');
  } else if (stats.assistantMessages > 0 && stats.userMessages === 0) {
    console.log('⚠️  PROBLEM: Hume is responding but NOT transcribing audio.');
    console.log('   Possible causes:');
    console.log('   1. Audio format is incorrect (WebM codec issue)');
    console.log('   2. Audio is silent or too quiet');
    console.log('   3. Audio chunks are being sent incorrectly');
    console.log('   4. Hume cannot decode the audio stream');
  } else if (stats.errors > 0) {
    console.log('❌ ERRORS DETECTED:');
    console.log('   Check the error messages above for details.');
  } else {
    console.log('⚠️  No response from Hume. Connection may have failed.');
  }

  console.log('');
  console.log('═════════════════════════════════════════════════════════════');

  // Save detailed log
  const logFile = `test-results-${Date.now()}.json`;
  fs.writeFileSync(logFile, JSON.stringify(stats, null, 2));
  console.log(`📝 Detailed log saved to: ${logFile}`);
  console.log('');

  // Exit
  setTimeout(() => {
    if (ws) ws.close();
    process.exit(stats.userMessages > 0 ? 0 : 1);
  }, 1000);
}

// Timeout after 30 seconds
setTimeout(() => {
  if (!testComplete) {
    console.log('');
    console.log('⏱️  Test timeout (30s)');
    showResults();
  }
}, 30000);
