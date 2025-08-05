const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// Retry function for API calls
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Parse AI response with retry
async function parseAIResponseWithRetry(operation, maxRetries = 3) {
  return withRetry(async () => {
    const response = await operation();
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid AI response format');
    }
    
    const content = response.choices[0].message.content;
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      return parsed;
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error('Failed to parse AI response as JSON');
        }
      }
      
      // If no JSON found, return a structured response
      return {
        title: 'Generated Content',
        content: content
      };
    }
  }, maxRetries);
}

// Get YouTube transcript
async function getTranscriptText(url) {
  const cacheKey = `transcript_${url}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('Using cached transcript');
    return cached;
  }
  
  try {
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', ['get_transcript.py', url]);
    
    return new Promise((resolve, reject) => {
      let transcript = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        transcript += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python process error:', error);
          reject(new Error(`Python process exited with code ${code}: ${error}`));
        } else {
          const cleanTranscript = transcript.trim();
          cache.set(cacheKey, cleanTranscript);
          resolve(cleanTranscript);
        }
      });
    });
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
  }
}

module.exports = {
  withRetry,
  parseAIResponseWithRetry,
  getTranscriptText
}; 