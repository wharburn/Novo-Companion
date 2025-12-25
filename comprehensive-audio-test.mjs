/**
 * Comprehensive Audio Testing - Try Multiple Approaches
 * This will test different audio formats and transmission methods
 */

import WebSocket from 'ws';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const HUME_WS_URL = 'ws://localhost:3000/api/hume/ws?userId=comprehensive-test';
const TEST_AUDIO_FILE = process.argv[2] || '/Users/wph/Downloads/test-audio-1.webm';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      🔬 COMPREHENSIVE AUDIO TESTING - HUME EVI            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📁 Testing: ${TEST_AUDIO_FILE}`);
console.log('');

// Test approaches
const approaches = [
  {
    name: 'Approach 1: Send Full WebM as Base64',
    test: async () => {
      const buffer = fs.readFileSync(TEST_AUDIO_FILE);
      const base64 = buffer.toString('base64');
      return { type: 'audio_input', data: base64 };
    }
  },
  {
    name: 'Approach 2: Convert to PCM and send',
    test: async () => {
      // Try converting WebM to raw PCM using ffmpeg
      try {
        const { stdout } = await execAsync(
          `ffmpeg -i "${TEST_AUDIO_FILE}" -f s16le -acodec pcm_s16le -ar 16000 -ac 1 - 2>/dev/null | base64`
        );
        return { type: 'audio_input', data: stdout.trim() };
      } catch (error) {
        throw new Error('FFmpeg not available or conversion failed');
      }
    }
  },
  {
    name: 'Approach 3: Send as binary (not base64)',
    test: async () => {
      const buffer = fs.readFileSync(TEST_AUDIO_FILE);
      return buffer; // Send raw binary
    }
  }
];

async function testApproach(approach, index) {
  console.log('═════════════════════════════════════════════════════════════');
  console.log(`TEST ${index + 1}/${approaches.length}: ${approach.name}`);
  console.log('═════════════════════════════════════════════════════════════');
  console.log('');

  return new Promise(async (resolve) => {
    const stats = {
      userMessages: 0,
      assistantMessages: 0,
      errors: 0,
      success: false
    };

    let ws = null;
    let testComplete = false;

    try {
      // Prepare the message
      console.log('📦 Preparing audio data...');
      const message = await approach.test();
      console.log('✅ Audio data prepared');
      console.log('');

      // Connect to Hume
      console.log('🔌 Connecting to Hume...');
      ws = new WebSocket(HUME_WS_URL);

      ws.on('open', () => {
        console.log('✅ Connected');
        console.log('📤 Sending audio...');
        
        if (Buffer.isBuffer(message)) {
          ws.send(message);
        } else {
          ws.send(JSON.stringify(message));
        }
        
        console.log('✅ Audio sent');
        console.log('⏳ Waiting for response...');
        console.log('');
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          console.log(`📥 ${msg.type}`);

          if (msg.type === 'user_message') {
            stats.userMessages++;
            console.log('');
            console.log('🎉🎉🎉 SUCCESS! TRANSCRIPTION RECEIVED! 🎉🎉🎉');
            console.log(`🎤 "${msg.message.content}"`);
            console.log('');
            stats.success = true;
            
            setTimeout(() => {
              if (!testComplete) {
                testComplete = true;
                ws.close();
                resolve(stats);
              }
            }, 1000);
          } else if (msg.type === 'assistant_message') {
            stats.assistantMessages++;
          } else if (msg.type === 'error') {
            stats.errors++;
            console.log(`❌ Error: [${msg.code}] ${msg.message}`);
          } else if (msg.type === 'assistant_end') {
            setTimeout(() => {
              if (!testComplete) {
                testComplete = true;
                ws.close();
                resolve(stats);
              }
            }, 2000);
          }
        } catch (e) {
          // Binary data
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        if (!testComplete) {
          testComplete = true;
          resolve(stats);
        }
      });

      ws.on('close', () => {
        if (!testComplete) {
          testComplete = true;
          resolve(stats);
        }
      });

      // Timeout
      setTimeout(() => {
        if (!testComplete) {
          console.log('⏱️  Timeout');
          testComplete = true;
          if (ws) ws.close();
          resolve(stats);
        }
      }, 15000);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (ws) ws.close();
      resolve(stats);
    }
  });
}

async function runAllTests() {
  const results = [];

  for (let i = 0; i < approaches.length; i++) {
    const result = await testApproach(approaches[i], i);
    results.push({
      approach: approaches[i].name,
      ...result
    });

    console.log('');
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`User Messages: ${result.userMessages}`);
    console.log(`Assistant Messages: ${result.assistantMessages}`);
    console.log(`Errors: ${result.errors}`);
    console.log('');

    if (i < approaches.length - 1) {
      console.log('⏳ Waiting 3 seconds before next test...');
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Final summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    🏁 FINAL RESULTS                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const successful = results.filter(r => r.success);
  
  if (successful.length > 0) {
    console.log('🎉 WORKING APPROACHES:');
    successful.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.approach}`);
    });
    console.log('');
    console.log('✅ SOLUTION FOUND! Use the approach(es) above.');
  } else {
    console.log('❌ NO APPROACHES WORKED');
    console.log('');
    console.log('This suggests a deeper issue. Possible causes:');
    console.log('1. Hume API configuration issue');
    console.log('2. Audio codec not supported by Hume');
    console.log('3. Server-side audio forwarding issue');
  }

  console.log('');
  process.exit(successful.length > 0 ? 0 : 1);
}

runAllTests();

