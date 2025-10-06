// Test script for AI assist functionality
const axios = require('axios');

async function testAiAssist() {
  try {
    console.log('Testing AI Assist functionality...\n');
    
    const testContent = `This is some example content that we want to improve. It has some basic information but could be enhanced with better formatting and structure. The content might have grammar issues and could be more engaging for readers.`;
    
    const testPrompts = [
      'Make this more concise',
      'Add bullet points',
      'Fix grammar and improve writing',
      'Make it more professional',
      'Simplify the language'
    ];
    
    for (const prompt of testPrompts) {
      console.log(`Testing prompt: "${prompt}"`);
      console.log('Original content:', testContent.substring(0, 100) + '...');
      
      // Simulate the AI assist request (without auth for testing)
      const response = await simulateAiAssist(testContent, prompt);
      
      console.log('Enhanced content:', response.enhancedContent.substring(0, 100) + '...');
      console.log('Success:', response.success);
      console.log('---\n');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function simulateAiAssist(content, prompt) {
  // This simulates the backend logic
  let enhancedContent = content;
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('concise') || promptLower.includes('shorter')) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, Math.ceil(sentences.length * 0.7));
    enhancedContent = keyPoints.map(sentence => sentence.trim()).join('. ') + '.';
    
  } else if (promptLower.includes('bullet') || promptLower.includes('list')) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    enhancedContent = sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
    
  } else if (promptLower.includes('grammar') || promptLower.includes('improve')) {
    enhancedContent = content
      .replace(/\bi\b/g, 'I')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
      .trim();
      
  } else if (promptLower.includes('professional')) {
    enhancedContent = content
      .replace(/\b(really|very|pretty|quite)\s+/gi, '')
      .replace(/\b(awesome|cool|great|nice)\b/gi, 'excellent');
      
  } else if (promptLower.includes('simple')) {
    enhancedContent = content
      .replace(/\b(utilize|implement|facilitate)\b/gi, 'use')
      .replace(/\b(subsequently|therefore|consequently)\b/gi, 'so');
  }
  
  return {
    success: true,
    enhancedContent,
    originalContent: content,
    appliedPrompt: prompt
  };
}

// Run the test
testAiAssist();