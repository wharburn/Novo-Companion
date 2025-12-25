/**
 * Test audio with PROPER Hume EVI format
 * This converts WebM to PCM linear16 as Hume expects
 */

import WebSocket from 'ws';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const HUME_WS_URL = 'ws://localhost:3000/ws/hume?userId=format-test';
const TEST_AUDIO_FILE = process.argv[2] || '/Users/wph/Downloads/test-audio-1.webm';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      🎯 TESTING WITH PROPER HUME EVI FORMAT               ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📁 Input: ${TEST_AUDIO_FILE}`);
console.log('');

async function convertWebMToPCM(inputFile) {
  console.log('🔄 Converting WebM to PCM linear16...');
  
  try {
    // Convert WebM to raw PCM: 16-bit, 16kHz, mono
    const { stdout, stderr } = await execAsync(
      `ffmpeg -i "${inputFile}" -f s16le -acodec pcm_s16le -ar 16000 -ac 1 - 2>/dev/null | base64`
    );
    
    if (stderr && !stdout) {
      throw new Error(`FFmpeg error: ${stderr}`);
    }
    
    console.log(`✅ Converted to PCM (${(stdout.length / 1024).toFixed(2)} KB base64)`);
    return stdout.trim();
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.log('');
    console.log('💡 Make sure ffmpeg is installed:');
    console.log('   brew install ffmpeg');
    throw error;
  }
}

async function testWithProperFormat() {
  return new Promise(async (resolve) => {
    const stats = {
      userMessages: 0,
      assistantMessages: 0,
      transcriptions: [],
      success: false
    };

    let ws = null;
    let testComplete = false;

    try {
      // Convert audio first
      const pcmBase64 = await convertWebMToPCM(TEST_AUDIO_FILE);
      console.log('');

      // Connect to Hume
      console.log('🔌 Connecting to Hume...');
      ws = new WebSocket(HUME_WS_URL);

      ws.on('open', () => {
        console.log('✅ Connected');
        console.log('');

        // Step 1: Send session settings (REQUIRED!)
        console.log('📤 Step 1: Sending session_settings...');
        const sessionSettings = {
          type: 'session_settings',
          audio: {
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1
          }
        };
        ws.send(JSON.stringify(sessionSettings));
        console.log('✅ Session settings sent');
        console.log('');

        // Step 2: Send audio in chunks (simulate streaming)
        console.log('📤 Step 2: Sending audio in chunks...');
        const chunkSize = 8000; // ~8KB chunks
        let offset = 0;
        let chunkCount = 0;

        const sendNextChunk = () => {
          if (offset >= pcmBase64.length) {
            console.log(`✅ Sent ${chunkCount} chunks`);
            console.log('⏳ Waiting for transcription...');
            console.log('');
            return;
          }

          const chunk = pcmBase64.substring(offset, offset + chunkSize);
          const audioInput = {
            type: 'audio_input',
            data: chunk
          };
          
          ws.send(JSON.stringify(audioInput));
          chunkCount++;
          offset += chunkSize;

          // Send next chunk after small delay
          setTimeout(sendNextChunk, 50);
        };

        sendNextChunk();
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          
          if (msg.type === 'user_message') {
            stats.userMessages++;
            stats.transcriptions.push(msg.message.content);
            
            console.log('');
            console.log('🎉🎉🎉 SUCCESS! TRANSCRIPTION RECEIVED! 🎉🎉🎉');
            console.log('');
            console.log(`🎤 "${msg.message.content}"`);
            console.log('');
            stats.success = true;
            
            setTimeout(() => {
              if (!testComplete) {
                testComplete = true;
                ws.close();
                resolve(stats);
              }
            }, 2000);
          } else if (msg.type === 'assistant_message') {
            stats.assistantMessages++;
            console.log(`🤖 Assistant: "${msg.message.content}"`);
          } else if (msg.type === 'error') {
            console.error(`❌ Hume Error [${msg.code}]: ${msg.message}`);
          } else if (msg.type === 'assistant_end') {
            setTimeout(() => {
              if (!testComplete) {
                testComplete = true;
                ws.close();
                resolve(stats);
              }
            }, 3000);
          } else {
            console.log(`📥 ${msg.type}`);
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
          console.log('⏱️  Test timeout');
          testComplete = true;
          if (ws) ws.close();
          resolve(stats);
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (ws) ws.close();
      resolve(stats);
    }
  });
}

// Run the test
testWithProperFormat().then((stats) => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 FINAL RESULT                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Result: ${stats.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`User Messages: ${stats.userMessages}`);
  console.log(`Assistant Messages: ${stats.assistantMessages}`);
  console.log(`Transcriptions: ${stats.transcriptions.length}`);
  console.log('');
  
  if (stats.transcriptions.length > 0) {
    console.log('📝 Transcriptions:');
    stats.transcriptions.forEach((t, i) => {
      console.log(`   ${i + 1}. "${t}"`);
    });
    console.log('');
  }
  
  process.exit(stats.success ? 0 : 1);
});

