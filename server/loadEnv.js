import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory BEFORE anything else
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('✅ Environment variables loaded');

