// Test script for Groq AI integration
const AIAssistService = require('./services/aiAssistService');

async function testGroqIntegration() {
  console.log('Testing Groq AI Integration...\n');
  
  const aiService = new AIAssistService();
  
  // Check status
  const status = aiService.getStatus();
  console.log('AI Service Status:', status);
  console.log('API Key configured:', !!process.env.GROQ_API_KEY);
  console.log('---\n');
  
  // Test content
  const testContent = `
Artificial intelligence is changing the world. It has applications in healthcare, education, and business. 
Machine learning algorithms can process large amounts of data quickly. This technology helps companies make better decisions.
AI systems can automate repetitive tasks and improve efficiency in many industries.
  `.trim();
  
  const testPrompts = [
    'Make this more concise',
    'Add bullet points to organize the information',
    'Make it more engaging and interesting',
    'Simplify the language for beginners',
    'Make it more professional and formal'
  ];
  
  for (const prompt of testPrompts) {
    try {
      console.log(`\n🧪 Testing prompt: "${prompt}"`);
      console.log('Original content length:', testContent.length);
      
      const result = await aiService.enhanceContent(testContent, prompt, 'text');
      
      console.log('✅ Success!');
      console.log('Method used:', result.method);
      console.log('Model:', result.model || 'fallback');
      console.log('Enhanced content length:', result.enhancedContent.length);
      console.log('Enhanced content preview:', result.enhancedContent.substring(0, 150) + '...');
      console.log('---');
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      console.log('---');
    }
  }
  
  console.log('\n✨ Test completed!');
}

// Run the test
if (require.main === module) {
  testGroqIntegration().catch(console.error);
}

module.exports = { testGroqIntegration };