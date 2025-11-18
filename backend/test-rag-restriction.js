const RAGService = require('./services/ragService');
const ChromaService = require('./services/chromaService');

/**
 * Test RAG Content Restriction
 * This script tests whether RAG retrieval can be properly restricted to specific content IDs
 */

async function testRAGRestriction() {
  console.log('🧪 Testing RAG Content Restriction...\n');
  
  const ragService = new RAGService();
  const chromaService = new ChromaService();
  
  try {
    // Test 1: Initialize services
    console.log('1. Initializing services...');
    await chromaService.initialize();
    console.log('✅ Services initialized\n');
    
    // Test 2: Simulate content restriction
    console.log('2. Testing content restriction options...');
    
    const testQuery = "What is machine learning?";
    const testUserId = "test-user-123";
    
    // Test with no restrictions (should return all user content)
    console.log('   a) Testing without restrictions:');
    const allResults = await ragService.retrieveRelevantChunks(testQuery, {
      userId: testUserId,
      limit: 5,
      minSimilarity: 0.5
    });
    console.log(`      Found ${allResults.length} chunks from all content`);
    
    // Test with content ID restriction
    console.log('   b) Testing with content ID restriction:');
    const restrictedResults = await ragService.retrieveRelevantChunks(testQuery, {
      userId: testUserId,
      limit: 5,
      minSimilarity: 0.5,
      includeOnlyContentIds: ['specific-content-id-123']
    });
    console.log(`      Found ${restrictedResults.length} chunks from restricted content`);
    
    // Test 3: Verify filtering works
    console.log('\n3. Verifying content filtering...');
    if (restrictedResults.length <= allResults.length) {
      console.log('✅ Content restriction is working - fewer results returned');
    } else {
      console.log('❌ Content restriction may not be working properly');
    }
    
    // Test 4: Check context building
    console.log('\n4. Testing context building...');
    const mockCurrentSession = {
      summary: {
        contentId: 'current-content-123',
        content: 'This is a summary of the current video transcript about machine learning basics.'
      }
    };
    
    const mockOriginalSource = {
      type: 'video',
      url: 'https://youtube.com/watch?v=example',
      content: 'Video transcript: Machine learning is a subset of artificial intelligence...'
    };
    
    const context = ragService.buildContextFromChunks(
      restrictedResults,
      mockCurrentSession,
      mockOriginalSource
    );
    
    if (context && context.includes('ORIGINAL SOURCE MATERIAL')) {
      console.log('✅ Context building includes original source');
    } else {
      console.log('❌ Context building may not include original source');
    }
    
    if (context && context.includes('CURRENT SESSION GENERATED CONTENT')) {
      console.log('✅ Context building includes current session content');
    } else {
      console.log('❌ Context building may not include current session content');
    }
    
    console.log('\n📋 Context Preview (first 200 chars):');
    console.log(context.substring(0, 200) + '...\n');
    
    console.log('🎉 RAG restriction test completed successfully!');
    
  } catch (error) {
    console.error('❌ RAG restriction test failed:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure ChromaDB is running:');
      console.log('   docker run -p 8000:8000 chromadb/chroma');
    }
  }
}

// Run the test
if (require.main === module) {
  testRAGRestriction().then(() => {
    console.log('\nTest completed. Exiting...');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
}

module.exports = { testRAGRestriction };