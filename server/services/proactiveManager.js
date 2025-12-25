import { getUserProfile } from './upstashRedis.js';
import { initiateProactiveConversation } from './humeEVI.js';
import { searchMemories } from './upstashVector.js';

// Proactive conversation templates
const PROACTIVE_MESSAGES = {
  morning: [
    "Good morning! How did you sleep?",
    "Good morning! How are you feeling today?",
    "Morning! Did you sleep well last night?"
  ],
  afternoon: [
    "Good afternoon! How's your day going?",
    "How are you feeling this afternoon?",
    "Hope you're having a good day! How are you?"
  ],
  evening: [
    "Good evening! How was your day?",
    "Evening! How are you feeling?",
    "How did your day go today?"
  ]
};

// Get contextual proactive message
async function getContextualMessage(userId, timeOfDay) {
  try {
    const profile = await getUserProfile(userId);
    
    // Check for follow-ups from recent conversations
    const recentMemories = await searchMemories(userId, 'upcoming plans appointments', 3);
    
    if (recentMemories.length > 0) {
      const memory = recentMemories[0];
      
      // Check if user mentioned calling someone
      if (memory.content.toLowerCase().includes('call')) {
        const match = memory.content.match(/call (\w+)/i);
        if (match) {
          return `Did you get a chance to call ${match[1]} today?`;
        }
      }
      
      // Check for appointments
      if (memory.content.toLowerCase().includes('appointment')) {
        return "How did your appointment go?";
      }
    }
    
    // Check medical conditions for contextual check-ins
    if (profile?.knownInfo?.medical?.length > 0) {
      const condition = profile.knownInfo.medical[0];
      if (timeOfDay === 'morning') {
        return `Good morning! How is your ${condition} feeling today?`;
      }
    }
    
    // Default messages
    const messages = PROACTIVE_MESSAGES[timeOfDay] || PROACTIVE_MESSAGES.morning;
    return messages[Math.floor(Math.random() * messages.length)];
  } catch (error) {
    console.error('Error getting contextual message:', error);
    const messages = PROACTIVE_MESSAGES[timeOfDay] || PROACTIVE_MESSAGES.morning;
    return messages[0];
  }
}

// Schedule proactive check-ins
export function scheduleProactiveCheckIns(userId, settings) {
  const schedules = [];
  
  if (settings.conversationMode !== 'proactive') {
    return schedules;
  }
  
  // Morning check-in
  if (settings.checkInTimes?.morning) {
    const [hour, minute] = settings.checkInTimes.morning.split(':');
    schedules.push({
      hour: parseInt(hour),
      minute: parseInt(minute),
      timeOfDay: 'morning'
    });
  }
  
  // Afternoon check-in
  if (settings.checkInTimes?.afternoon) {
    const [hour, minute] = settings.checkInTimes.afternoon.split(':');
    schedules.push({
      hour: parseInt(hour),
      minute: parseInt(minute),
      timeOfDay: 'afternoon'
    });
  }
  
  // Evening check-in
  if (settings.checkInTimes?.evening) {
    const [hour, minute] = settings.checkInTimes.evening.split(':');
    schedules.push({
      hour: parseInt(hour),
      minute: parseInt(minute),
      timeOfDay: 'evening'
    });
  }
  
  return schedules;
}

// Execute proactive check-in
export async function executeProactiveCheckIn(userId, timeOfDay) {
  try {
    console.log(`🔔 Executing proactive check-in for ${userId} (${timeOfDay})`);
    
    const message = await getContextualMessage(userId, timeOfDay);
    const success = await initiateProactiveConversation(userId, message);
    
    if (success) {
      console.log(`✅ Proactive message sent: "${message}"`);
    } else {
      console.log(`⚠️ User not connected, skipping proactive message`);
    }
    
    return success;
  } catch (error) {
    console.error('Error executing proactive check-in:', error);
    return false;
  }
}

// Check if it's time for a proactive message
export async function checkProactiveSchedule(userId) {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile?.settings?.conversationMode === 'proactive') {
      return null;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const schedules = scheduleProactiveCheckIns(userId, profile.settings);
    
    for (const schedule of schedules) {
      if (schedule.hour === currentHour && schedule.minute === currentMinute) {
        await executeProactiveCheckIn(userId, schedule.timeOfDay);
        return schedule.timeOfDay;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking proactive schedule:', error);
    return null;
  }
}

export default {
  scheduleProactiveCheckIns,
  executeProactiveCheckIn,
  checkProactiveSchedule,
  getContextualMessage
};

