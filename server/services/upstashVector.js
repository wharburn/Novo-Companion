import { Index } from '@upstash/vector';

let vectorIndex = null;

export async function initializeVector() {
  try {
    vectorIndex = new Index({
      url: process.env.UPSTASH_VECTOR_URL,
      token: process.env.UPSTASH_VECTOR_TOKEN,
    });
    
    console.log('✅ Upstash Vector connected');
    return vectorIndex;
  } catch (error) {
    console.error('❌ Upstash Vector connection failed:', error);
    throw error;
  }
}

export function getVectorIndex() {
  if (!vectorIndex) {
    throw new Error('Vector index not initialized. Call initializeVector() first.');
  }
  return vectorIndex;
}

// Family tree operations
export async function saveFamilyMember(userId, memberData) {
  try {
    const id = `family:${userId}:${memberData.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Create embedding-friendly text
    const text = `
      Name: ${memberData.name}
      Relationship: ${memberData.relationship}
      Age: ${memberData.age || 'unknown'}
      Location: ${memberData.location || 'unknown'}
      Occupation: ${memberData.occupation || 'unknown'}
      Children: ${memberData.children?.join(', ') || 'none'}
      Notes: ${memberData.notes?.join(', ') || 'none'}
    `.trim();
    
    await vectorIndex.upsert({
      id,
      data: text,
      metadata: {
        userId,
        type: 'family_member',
        ...memberData,
        lastUpdated: new Date().toISOString()
      }
    });
    
    return { id, ...memberData };
  } catch (error) {
    console.error('Error saving family member:', error);
    throw error;
  }
}

export async function getFamilyMembers(userId) {
  try {
    // Query for all family members of this user
    const results = await vectorIndex.query({
      data: `family members of user ${userId}`,
      topK: 50,
      includeMetadata: true,
      filter: `type = 'family_member' AND userId = '${userId}'`
    });
    
    return results.map(r => r.metadata);
  } catch (error) {
    console.error('Error getting family members:', error);
    throw error;
  }
}

export async function searchFamilyMembers(userId, query) {
  try {
    const results = await vectorIndex.query({
      data: query,
      topK: 5,
      includeMetadata: true,
      filter: `type = 'family_member' AND userId = '${userId}'`
    });
    
    return results.map(r => ({
      score: r.score,
      ...r.metadata
    }));
  } catch (error) {
    console.error('Error searching family members:', error);
    throw error;
  }
}

// Memory operations
export async function saveMemory(userId, memoryData) {
  try {
    const id = `memory:${userId}:${Date.now()}`;
    
    const text = `
      Topic: ${memoryData.topic}
      Content: ${memoryData.content}
      Context: ${memoryData.context || ''}
      Related to: ${memoryData.relatedTo || ''}
    `.trim();
    
    await vectorIndex.upsert({
      id,
      data: text,
      metadata: {
        userId,
        type: 'memory',
        ...memoryData,
        timestamp: new Date().toISOString()
      }
    });
    
    return { id, ...memoryData };
  } catch (error) {
    console.error('Error saving memory:', error);
    throw error;
  }
}

export async function searchMemories(userId, query, limit = 5) {
  try {
    const results = await vectorIndex.query({
      data: query,
      topK: limit,
      includeMetadata: true,
      filter: `type = 'memory' AND userId = '${userId}'`
    });
    
    return results.map(r => ({
      score: r.score,
      ...r.metadata
    }));
  } catch (error) {
    console.error('Error searching memories:', error);
    throw error;
  }
}

export default {
  initializeVector,
  getVectorIndex,
  saveFamilyMember,
  getFamilyMembers,
  searchFamilyMembers,
  saveMemory,
  searchMemories
};

