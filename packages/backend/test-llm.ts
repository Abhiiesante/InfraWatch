import { LLMService } from './src/services/llm.service.js';
import { env } from 'process';

async function testLLM() {
  console.log('Testing Mock LLM Stream...');
  
  // Force mock for testing if no key
  if (!env.GEMINI_API_KEY) {
      env.GEMINI_API_KEY = 'mock'; 
  }

  const prompt = "Please analyze the following incident: High temperature on sensor A1.";
  
  process.stdout.write('Response: ');
  await LLMService.streamCompletion(prompt, (chunk) => {
    process.stdout.write(chunk);
  });
  console.log('\n\nStream Finished.');
}

testLLM().catch(console.error);
