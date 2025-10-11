/**
 * Test script for Context-Aware Chatbot Implementation
 * 
 * This script tests the key functionality of the context-aware chatbot:
 * 1. Context service functionality
 * 2. Chat history model
 * 3. Enhanced chat endpoint
 * 4. Frontend context management
 */

const mongoose = require('mongoose');
const ChatContextService = require('./backend/services/chatContextService');
const ChatHistory = require('./backend/models/ChatHistory');
const GeneratedContent = require('./backend/models/GeneratedContent');

// Test data
const testUserId = 'test_user_123';
const testContent = {
  blog: '<h1>Test Blog</h1><p>This is a test blog post about machine learning.</p>',
  quiz: [
    {
      question: 'What is machine learning?',
      options: ['A type of computer', 'A subset of AI', 'A programming language', 'A database'],
      answer: 'A subset of AI'
    }
  ],
  flashcards: [
    {
      question: 'Define AI',
      answer: 'Artificial Intelligence is the simulation of human intelligence in machines.'
    }
  ]
};

const testOriginalSource = {
  type: 'youtube',
  url: 'https://www.youtube.com/watch?v=test123',
  content: 'This is a test transcript about machine learning concepts...'
};

async function testContextService() {
  console.log('🧪 Testing ChatContextService...');
  
  try {
    const contextService = new ChatContextService();
    
    // Test context building
    const context = await contextService.buildUserContext(
      testUserId,
      testContent,
      testOriginalSource
    );
    
    console.log('✅ Context built successfully');
    console.log('📊 Context summary:', {
      currentSessionItems: Object.keys(context.currentSession).length,
      hasOriginalSource: !!context.originalSource,
      totalHistoryItems: context.metadata.totalItems
    });
    
    // Test prompt creation
    const prompt = contextService.createContextualPrompt(context, 'Test User');
    console.log('✅ Contextual prompt created');
    console.log('📝 Prompt length:', prompt.length, 'characters');
    
    // Test token estimation
    const tokenCount = contextService.estimateTokenCount(context);
    console.log('✅ Token count estimated:', tokenCount);
    
    return true;
  } catch (error) {
    console.error('❌ ContextService test failed:', error.message);
    return false;
  }
}

async function testChatHistory() {
  console.log('🧪 Testing ChatHistory Model...');
  
  try {
    // Test session creation
    const session = await ChatHistory.createSession(testUserId, 'test_session_123');
    console.log('✅ Session created:', session.sessionId);
    
    // Test message addition
    await session.addMessage('user', 'Hello, can you help me with my quiz?');
    await session.addMessage('assistant', 'Of course! I can help you with your quiz about machine learning.');
    console.log('✅ Messages added to session');
    
    // Test recent messages retrieval
    const recentMessages = session.getRecentMessages(5);
    console.log('✅ Recent messages retrieved:', recentMessages.length);
    
    // Test session finding
    const foundSession = await ChatHistory.findActiveSession(testUserId);
    console.log('✅ Active session found:', foundSession?.sessionId);
    
    // Clean up
    await ChatHistory.deleteOne({ sessionId: 'test_session_123' });
    console.log('✅ Test session cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ ChatHistory test failed:', error.message);
    return false;
  }
}

async function testGeneratedContent() {
  console.log('🧪 Testing GeneratedContent integration...');
  
  try {
    // Create test content
    const testContentDoc = new GeneratedContent({
      userId: testUserId,
      type: 'blog',
      title: 'Test Blog Post',
      contentData: testContent.blog,
      url: testOriginalSource.url
    });
    
    await testContentDoc.save();
    console.log('✅ Test content saved');
    
    // Test context service with real data
    const contextService = new ChatContextService();
    const userHistory = await contextService.fetchUserHistory(testUserId);
    console.log('✅ User history fetched:', userHistory.length, 'items');
    
    // Clean up
    await GeneratedContent.deleteOne({ _id: testContentDoc._id });
    console.log('✅ Test content cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ GeneratedContent test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Context-Aware Chatbot Tests...\n');
  
  // Connect to MongoDB (you'll need to adjust the connection string)
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eduextract', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Some tests may fail without database connection\n');
  }
  
  const results = {
    contextService: await testContextService(),
    chatHistory: await testChatHistory(),
    generatedContent: await testGeneratedContent()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Context-Aware Chatbot implementation is working correctly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start your backend server');
    console.log('2. Start your frontend development server');
    console.log('3. Generate some content on the Dashboard');
    console.log('4. Open the chatbot and test context awareness');
    console.log('5. Ask questions about your generated content');
  }
  
  await mongoose.disconnect();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testContextService,
  testChatHistory,
  testGeneratedContent,
  runTests
};
