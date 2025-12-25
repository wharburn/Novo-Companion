import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Testing .env file loading...\n');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Found (length: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ Not found');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Found (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : '❌ Not found');
console.log('HUME_API_KEY:', process.env.HUME_API_KEY ? '✅ Found' : '❌ Not found');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Found' : '❌ Not found');
console.log('UPSTASH_REDIS_URL:', process.env.UPSTASH_REDIS_URL ? '✅ Found' : '❌ Not found');
console.log('UPSTASH_VECTOR_URL:', process.env.UPSTASH_VECTOR_URL ? '✅ Found' : '❌ Not found');

