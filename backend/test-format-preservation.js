// Test script for format preservation in AI assistance
const AIAssistService = require('./services/aiAssistService');

async function testFormatPreservation() {
  console.log('🧪 Testing AI Assist Format Preservation...\n');
  
  const aiService = new AIAssistService();
  
  // Test cases for different content formats
  const testCases = [
    {
      name: 'Slides JSON',
      contentType: 'slides',
      content: JSON.stringify([
        {
          "id": 1,
          "type": "title",
          "title": "Introduction to AI",
          "content": "This presentation covers the basics of artificial intelligence and its applications."
        },
        {
          "id": 2,
          "type": "content",
          "title": "What is AI?",
          "content": "Artificial intelligence is the simulation of human intelligence in machines."
        }
      ], null, 2),
      prompt: 'Make this more engaging and professional'
    },
    
    {
      name: 'Quiz JSON',
      contentType: 'quiz',
      content: JSON.stringify({
        "title": "AI Basics Quiz",
        "questions": [
          {
            "id": 1,
            "question": "What does AI stand for?",
            "type": "multiple-choice",
            "options": ["Artificial Intelligence", "Automated Input", "Advanced Integration"],
            "correct": 0
          }
        ]
      }, null, 2),
      prompt: 'Improve the questions and make them clearer'
    },
    
    {
      name: 'Blog HTML',
      contentType: 'blog',
      content: '<h1>AI in Education</h1><p>AI is transforming education by providing personalized learning experiences.</p><p>Students can now get instant feedback and adaptive content.</p>',
      prompt: 'Make this more comprehensive and add more details'
    },
    
    {
      name: 'Summary HTML',
      contentType: 'summary',
      content: '<div><h2>Key Points</h2><ul><li>AI improves efficiency</li><li>Machine learning processes data</li><li>Applications are widespread</li></ul></div>',
      prompt: 'Expand each point with more explanation'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('Content Type:', testCase.contentType);
    console.log('Original format:', testCase.content.includes('{') ? 'JSON' : 'HTML');
    console.log('Prompt:', testCase.prompt);
    console.log('---');
    
    try {
      const result = await aiService.enhanceContent(
        testCase.content, 
        testCase.prompt, 
        testCase.contentType
      );
      
      console.log('✅ Enhancement successful!');
      console.log('Method used:', result.method);
      console.log('Preserved format:', result.preservedFormat);
      
      // Validate format preservation
      const originalIsJson = testCase.content.trim().startsWith('{') || testCase.content.trim().startsWith('[');
      const enhancedIsJson = result.enhancedContent.trim().startsWith('{') || result.enhancedContent.trim().startsWith('[');
      
      if (originalIsJson === enhancedIsJson) {
        console.log('✅ Format preserved correctly');
        
        if (originalIsJson) {
          try {
            JSON.parse(result.enhancedContent);
            console.log('✅ Enhanced JSON is valid');
          } catch (e) {
            console.log('❌ Enhanced JSON is invalid:', e.message);
          }
        }
      } else {
        console.log('❌ Format NOT preserved - original:', originalIsJson ? 'JSON' : 'HTML/Text', 'enhanced:', enhancedIsJson ? 'JSON' : 'HTML/Text');
      }
      
      console.log('Enhanced preview:', result.enhancedContent.substring(0, 200) + '...');
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n🎯 Format Preservation Test Complete!');
}

// Run the test
if (require.main === module) {
  testFormatPreservation().catch(console.error);
}

module.exports = { testFormatPreservation };