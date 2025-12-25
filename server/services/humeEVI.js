import WebSocket from 'ws';
import { extractLearnings } from './learningEngine.js';
import { saveConversation } from './upstashRedis.js';
import { analyzeImage } from './visionAI.js';

const HUME_API_KEY = process.env.HUME_API_KEY;
const HUME_CONFIG_ID = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

// Store active connections
const activeConnections = new Map();

// Helper to send context to Hume
async function sendContextToHume(humeWs, context, displayMsg) {
  if (!humeWs || humeWs.readyState !== WebSocket.OPEN) return;

  const combinedMsg = displayMsg ? `[SYSTEM CONTEXT: ${context}] ${displayMsg}` : context;

  humeWs.send(
    JSON.stringify({
      type: 'user_input',
      text: combinedMsg,
    })
  );
}

export function setupHumeWebSocket(wss) {
  wss.on('connection', (clientWs, req) => {
    console.log('🔌 Client connected to Hume WebSocket');

    const userId = req.url.split('userId=')[1]?.split('&')[0] || 'default';
    let humeWs = null;
    let audioChunkCount = 0;
    let audioOutputCount = 0;
    let assistantIsSpeaking = false; // Flag to pause mic input while assistant speaks

    // Connect to Hume EVI using raw WebSocket
    const humeUrl = `wss://api.hume.ai/v0/evi/chat?api_key=${HUME_API_KEY}&config_id=${HUME_CONFIG_ID}`;
    console.log('🔗 Connecting to Hume EVI...');

    humeWs = new WebSocket(humeUrl);

    humeWs.on('open', () => {
      console.log('✅ Connected to Hume EVI');
      activeConnections.set(userId, { clientWs, humeWs });

      // Send session settings to tell Hume about our audio format
      // Browser sends 16kHz resampled PCM Linear 16
      const sessionSettings = {
        type: 'session_settings',
        audio: {
          encoding: 'linear16',
          sample_rate: 16000,
          channels: 1,
        },
      };
      humeWs.send(JSON.stringify(sessionSettings));
      console.log('📤 Sent session settings:', sessionSettings);

      clientWs.send(
        JSON.stringify({
          type: 'connection_status',
          status: 'connected',
        })
      );
    });

    // Handle messages from Hume
    humeWs.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'user_message') {
          console.log('🎤 Hume -> Client: user_message');
          console.log('   Content:', data.message?.content?.substring(0, 100) || 'N/A');

          saveConversation(userId, {
            type: 'user',
            message: data.message,
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error('Error saving user message:', err));

          extractLearnings(userId, data).catch((err) =>
            console.error('Error extracting learnings:', err)
          );
        } else if (data.type === 'assistant_message') {
          console.log('📥 Hume -> Client: assistant_message');

          saveConversation(userId, {
            type: 'assistant',
            message: data.message,
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error('Error saving assistant message:', err));
        } else if (data.type === 'audio_output') {
          // Assistant is speaking - pause mic input
          assistantIsSpeaking = true;
          audioOutputCount++;
          if (audioOutputCount === 1 || audioOutputCount % 10 === 0) {
            console.log(
              `🔊 Hume -> Client: audio_output #${audioOutputCount}, ${
                data.data?.length || 0
              } chars`
            );
          }
        } else if (data.type === 'assistant_end') {
          // Assistant finished speaking - resume mic input
          assistantIsSpeaking = false;
          console.log('📥 Hume -> Client: assistant_end');
        } else if (data.type === 'chat_metadata') {
          console.log('📥 Hume -> Client: chat_metadata');
          console.log('   Chat ID:', data.chat_id);
        } else if (data.type === 'error') {
          console.error('❌ Hume Error:', data);
        } else {
          console.log('📥 Hume -> Client:', data.type);
        }

        // Forward to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(data));
        }
      } catch (err) {
        // Binary audio data - forward directly
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(message);
        }
      }
    });

    humeWs.on('error', (err) => {
      console.error('❌ Hume WebSocket error:', err.message);
    });

    humeWs.on('close', (code, reason) => {
      console.log('🔌 Hume disconnected', { code, reason: reason?.toString() });
      activeConnections.delete(userId);

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'connection_status',
            status: 'disconnected',
          })
        );
      }
    });

    // Message types that should NOT be forwarded to Hume
    const localOnlyTypes = ['camera_enabled', 'camera_disabled', 'face_frame'];
    let cameraEnabled = false;
    let firstFrameProcessed = false;

    // Forward messages from client to Hume
    clientWs.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle local-only messages (don't forward to Hume)
        if (localOnlyTypes.includes(data.type)) {
          if (data.type === 'camera_enabled') {
            console.log('📷 Camera enabled by user');
            cameraEnabled = true;
            firstFrameProcessed = false;
          } else if (data.type === 'camera_disabled') {
            console.log('📷 Camera disabled by user');
            cameraEnabled = false;
          } else if (data.type === 'face_frame' && cameraEnabled && !firstFrameProcessed) {
            // Process first frame after camera enabled
            firstFrameProcessed = true;
            console.log('📷 Processing first camera frame...');

            try {
              const result = await analyzeImage(
                data.data,
                'In under 100 characters, describe the person you see.'
              );

              if (result.success && humeWs && humeWs.readyState === WebSocket.OPEN) {
                // Truncate to ensure under 256 chars total
                const desc = result.description.substring(0, 150);
                console.log('📷 Vision context:', desc);

                // Send short context as assistant_input
                humeWs.send(
                  JSON.stringify({
                    type: 'assistant_input',
                    text: `(I see: ${desc}. Briefly acknowledge.)`,
                  })
                );
              }
            } catch (err) {
              console.error('📷 Vision analysis error:', err.message);
            }
          }
          return;
        }

        if (data.type === 'audio_input') {
          audioChunkCount++;

          // Skip forwarding audio while assistant is speaking to prevent interruptions
          if (assistantIsSpeaking) {
            return; // Don't forward mic input while assistant speaks
          }

          if (audioChunkCount === 1 || audioChunkCount % 50 === 0) {
            console.log(`📤 Client -> Hume: audio_input #${audioChunkCount}`);
          }
        } else {
          console.log('📤 Client -> Hume:', data.type);
        }

        // Forward to Hume
        if (humeWs && humeWs.readyState === WebSocket.OPEN) {
          humeWs.send(JSON.stringify(data));
        }
      } catch (err) {
        // Binary data - forward directly
        if (humeWs && humeWs.readyState === WebSocket.OPEN) {
          humeWs.send(message);
        }
      }
    });

    // Handle client disconnection
    clientWs.on('close', () => {
      console.log('🔌 Client disconnected');
      if (humeWs && humeWs.readyState === WebSocket.OPEN) {
        humeWs.close();
      }
      activeConnections.delete(userId);
    });
  });
}

// Proactive conversation initiation
export async function initiateProactiveConversation(userId, message) {
  try {
    const connection = activeConnections.get(userId);

    if (!connection || connection.humeWs.readyState !== WebSocket.OPEN) {
      console.log('⚠️ No active connection for proactive message');
      return false;
    }

    // Send proactive message through Hume
    connection.humeWs.send(
      JSON.stringify({
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: message,
        },
      })
    );

    return true;
  } catch (error) {
    console.error('Error initiating proactive conversation:', error);
    return false;
  }
}

// Inject image context into the conversation so NoVo can ask follow-up questions
export async function injectImageContext(userId, imageDescription) {
  try {
    const connection = activeConnections.get(userId);

    if (!connection || connection.humeWs.readyState !== WebSocket.OPEN) {
      console.log('⚠️ No active connection for image context injection');
      return false;
    }

    // Send a text input that simulates the user showing an image
    // This triggers NoVo to respond and ask follow-up questions
    const contextMessage = `[The user just showed me an image. Here's what I can see: ${imageDescription}]

I should now:
1. Acknowledge what I see in the image
2. Ask the user what this image is about and why they wanted to show it to me
3. If there are people in the image, ask who they are
4. Ask about the relevance or significance of this image
5. Feel free to ask any other follow-up questions to fully understand the context`;

    connection.humeWs.send(
      JSON.stringify({
        type: 'user_input',
        text: contextMessage,
      })
    );

    console.log('📷 Injected image context for user:', userId);
    return true;
  } catch (error) {
    console.error('Error injecting image context:', error);
    return false;
  }
}

export default {
  setupHumeWebSocket,
  initiateProactiveConversation,
  injectImageContext,
};
