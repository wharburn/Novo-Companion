import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize OpenAI client (optional - only if API key is provided)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Initialize Anthropic client (optional - only if API key is provided)
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

// Analyze image with GPT-4 Vision
export async function analyzeImageGPT4(imageData, userPrompt = null) {
  try {
    const prompt =
      userPrompt ||
      'Describe what you see clearly and helpfully for an elderly person. If there is text visible, read it aloud. Be specific and detailed.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageData.startsWith('data:')
                  ? imageData
                  : `data:image/jpeg;base64,${imageData}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    return {
      success: true,
      description: response.choices[0].message.content,
      provider: 'gpt-4-vision',
    };
  } catch (error) {
    console.error('Error with GPT-4 Vision:', error);
    throw error;
  }
}

// Analyze image with Claude 3.5 Sonnet
export async function analyzeImageClaude(imageData, userPrompt = null) {
  try {
    const prompt =
      userPrompt ||
      'Describe what you see clearly and helpfully for an elderly person. If there is text visible, read it aloud. Be specific and detailed.';

    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    return {
      success: true,
      description: response.content[0].text,
      provider: 'claude-3.5-sonnet',
    };
  } catch (error) {
    console.error('Error with Claude Vision:', error);
    throw error;
  }
}

// Main vision analysis function (tries preferred provider, falls back to alternative)
export async function analyzeImage(imageData, userPrompt = null, preferredProvider = 'gpt4') {
  try {
    if (preferredProvider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      try {
        return await analyzeImageClaude(imageData, userPrompt);
      } catch (error) {
        console.log('Claude failed, falling back to GPT-4...');
        if (process.env.OPENAI_API_KEY) {
          return await analyzeImageGPT4(imageData, userPrompt);
        }
        throw error;
      }
    } else if (process.env.OPENAI_API_KEY) {
      try {
        return await analyzeImageGPT4(imageData, userPrompt);
      } catch (error) {
        console.log('GPT-4 failed, falling back to Claude...');
        if (process.env.ANTHROPIC_API_KEY) {
          return await analyzeImageClaude(imageData, userPrompt);
        }
        throw error;
      }
    } else {
      throw new Error('No vision AI provider configured');
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Specialized analysis for specific use cases
export async function analyzeForElderly(imageData, context) {
  const prompts = {
    medicine:
      'Read all text on this medicine label clearly. Include the medication name, dosage, and any important warnings.',
    plant:
      'Identify this plant and explain why it might be unhealthy. Provide simple care instructions.',
    photo:
      'Describe this photo in detail. If there are people, describe what they are doing and wearing.',
    bird: 'Identify this bird species. Describe its appearance and any interesting facts.',
    general: 'Describe what you see in detail, as if explaining to someone who cannot see it well.',
  };

  const prompt = prompts[context] || prompts.general;
  return await analyzeImage(imageData, prompt);
}

export default {
  analyzeImage,
  analyzeImageGPT4,
  analyzeImageClaude,
  analyzeForElderly,
};
