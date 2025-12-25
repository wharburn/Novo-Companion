import OpenAI from 'openai';
import { getUserProfile, saveUserProfile } from './upstashRedis.js';
import { saveFamilyMember, saveMemory } from './upstashVector.js';

// Initialize OpenAI client (optional - only if API key is provided)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Extract learnings from conversation
export async function extractLearnings(userId, conversationData) {
  try {
    // Skip if OpenAI is not configured
    if (!openai) {
      console.log('Learning engine disabled: OpenAI API key not configured');
      return;
    }

    const { message } = conversationData;
    if (!message?.content) return;

    const userProfile = (await getUserProfile(userId)) || {
      userId,
      knownInfo: {
        medical: [],
        medications: [],
        routines: {},
        preferences: {},
        family: [],
      },
    };

    // Use GPT to extract structured information
    const prompt = `
You are analyzing a conversation with an elderly user to extract important information.
Extract any of the following if mentioned:
- Medical conditions
- Medications
- Daily routines
- Food/activity preferences
- Family members (name, relationship, details)
- Upcoming appointments
- Emotional state or concerns

User message: "${message.content}"

Return JSON with extracted information in this format:
{
  "medical": ["condition1", "condition2"],
  "medications": ["med1 dosage"],
  "routines": {"activity": "time"},
  "preferences": {"category": ["item1", "item2"]},
  "family": [{"name": "Name", "relationship": "daughter", "details": "any details"}],
  "appointments": ["appointment description"],
  "emotions": ["emotion or concern"],
  "memories": [{"topic": "topic", "content": "what to remember"}]
}

Only include fields where new information was found. Return empty object {} if nothing to extract.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You extract structured information from conversations.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const extracted = JSON.parse(response.choices[0].message.content);

    // Update user profile with extracted information
    if (extracted.medical?.length > 0) {
      userProfile.knownInfo.medical = [
        ...new Set([...userProfile.knownInfo.medical, ...extracted.medical]),
      ];
    }

    if (extracted.medications?.length > 0) {
      userProfile.knownInfo.medications = [
        ...new Set([...userProfile.knownInfo.medications, ...extracted.medications]),
      ];
    }

    if (extracted.routines) {
      userProfile.knownInfo.routines = {
        ...userProfile.knownInfo.routines,
        ...extracted.routines,
      };
    }

    if (extracted.preferences) {
      userProfile.knownInfo.preferences = {
        ...userProfile.knownInfo.preferences,
        ...extracted.preferences,
      };
    }

    // Save family members to vector DB
    if (extracted.family?.length > 0) {
      for (const member of extracted.family) {
        await saveFamilyMember(userId, member);
      }
    }

    // Save memories to vector DB
    if (extracted.memories?.length > 0) {
      for (const memory of extracted.memories) {
        await saveMemory(userId, {
          ...memory,
          context: message.content,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update user profile
    userProfile.lastInteraction = new Date().toISOString();
    await saveUserProfile(userId, userProfile);

    console.log('📚 Learnings extracted and saved for user:', userId);

    return extracted;
  } catch (error) {
    console.error('Error extracting learnings:', error);
    return null;
  }
}

// Generate contextual response based on user history
export async function generateContextualPrompt(userId, currentMessage) {
  try {
    const userProfile = await getUserProfile(userId);

    if (!userProfile) {
      return currentMessage;
    }

    // Build context from known information
    const context = [];

    if (userProfile.knownInfo.medical?.length > 0) {
      context.push(`Medical: ${userProfile.knownInfo.medical.join(', ')}`);
    }

    if (userProfile.knownInfo.medications?.length > 0) {
      context.push(`Medications: ${userProfile.knownInfo.medications.join(', ')}`);
    }

    if (Object.keys(userProfile.knownInfo.routines || {}).length > 0) {
      context.push(`Routines: ${JSON.stringify(userProfile.knownInfo.routines)}`);
    }

    return {
      message: currentMessage,
      context: context.join('\n'),
    };
  } catch (error) {
    console.error('Error generating contextual prompt:', error);
    return currentMessage;
  }
}

export default {
  extractLearnings,
  generateContextualPrompt,
};
