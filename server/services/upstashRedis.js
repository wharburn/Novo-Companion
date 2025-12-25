import { Redis } from '@upstash/redis';

let redis = null;

export async function initializeRedis() {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
    
    // Test connection
    await redis.ping();
    console.log('✅ Upstash Redis connected');
    return redis;
  } catch (error) {
    console.error('❌ Upstash Redis connection failed:', error);
    throw error;
  }
}

export function getRedis() {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redis;
}

// User profile operations
export async function getUserProfile(userId) {
  try {
    const profile = await redis.get(`user:${userId}`);
    return profile || null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

export async function saveUserProfile(userId, profile) {
  try {
    await redis.set(`user:${userId}`, profile);
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

export async function updateUserSettings(userId, settings) {
  try {
    const profile = await getUserProfile(userId) || {};
    profile.settings = { ...profile.settings, ...settings };
    profile.lastUpdated = new Date().toISOString();
    await saveUserProfile(userId, profile);
    return profile;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

// Session management
export async function saveSession(sessionId, data, expirySeconds = 3600) {
  try {
    await redis.setex(`session:${sessionId}`, expirySeconds, data);
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}

export async function getSession(sessionId) {
  try {
    const session = await redis.get(`session:${sessionId}`);
    return session || null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
}

// Conversation history
export async function saveConversation(userId, conversationData) {
  try {
    const key = `conversation:${userId}:${Date.now()}`;
    await redis.set(key, conversationData);
    
    // Add to user's conversation list
    await redis.lpush(`conversations:${userId}`, key);
    
    // Keep only last 100 conversations
    await redis.ltrim(`conversations:${userId}`, 0, 99);
    
    return key;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

export async function getRecentConversations(userId, limit = 10) {
  try {
    const keys = await redis.lrange(`conversations:${userId}`, 0, limit - 1);
    const conversations = await Promise.all(
      keys.map(key => redis.get(key))
    );
    return conversations.filter(c => c !== null);
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
}

export default {
  initializeRedis,
  getRedis,
  getUserProfile,
  saveUserProfile,
  updateUserSettings,
  saveSession,
  getSession,
  saveConversation,
  getRecentConversations
};

