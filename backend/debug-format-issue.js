// Quick test to debug format preservation issues
const AIAssistService = require('./services/aiAssistService');

async function debugFormatIssue() {
  console.log('🔍 Debugging Format Preservation Issue...\n');
  
  const aiService = new AIAssistService();
  
  // Simple test case that's causing issues
  const testContent = JSON.stringify([
    {
      "id": 1,
      "type": "title",
      "title": "Introduction to AI",
      "content": "This is about artificial intelligence basics."
    },
    {
      "id": 2,
      "type": "content", 
      "title": "What is AI?",
      "content": "AI is smart computer programs."
    }
  ], null, 2);
  
  console.log('Original content:');
  console.log(testContent);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const result = await aiService.enhanceContent(
      testContent,
      'Make this more professional and detailed',
      'slides'
    );
    
    console.log('Enhancement result:');
    console.log('Success:', result.success);
    console.log('Method:', result.method);
    console.log('Preserved format:', result.preservedFormat);
    
    console.log('\nEnhanced content:');
    console.log(result.enhancedContent);
    
    // Test if it's valid JSON
    try {
      const parsed = JSON.parse(result.enhancedContent);
      console.log('\n✅ Enhanced content is valid JSON');
      console.log('Array length:', Array.isArray(parsed) ? parsed.length : 'Not an array');
      
      if (Array.isArray(parsed)) {
        console.log('First item keys:', Object.keys(parsed[0] || {}));
      }
      
    } catch (e) {
      console.log('\n❌ Enhanced content is NOT valid JSON:', e.message);
    }
    
  } catch (error) {
    console.log('❌ Enhancement failed:', error.message);
  }
}

// Run the debug test
debugFormatIssue().catch(console.error);