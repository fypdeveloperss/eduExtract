// Test script for marketplace functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/marketplace';

async function testMarketplace() {
  try {
    console.log('🧪 Testing Marketplace API...\n');
    
    // Test 1: Get categories
    console.log('📚 Test 1: Getting categories...');
    try {
      const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
      console.log('✅ Categories retrieved successfully!');
      console.log('   Available categories:', categoriesResponse.data.categories.length);
      console.log('   Difficulties:', categoriesResponse.data.difficulties.length);
      console.log('   Content types:', categoriesResponse.data.contentTypes.length);
    } catch (error) {
      console.log('❌ Categories test failed:', error.response?.data?.error || error.message);
    }
    
    // Test 2: Browse content (should work without authentication)
    console.log('\n🔍 Test 2: Browsing content...');
    try {
      const browseResponse = await axios.get(`${BASE_URL}/content?limit=5`);
      console.log('✅ Content browse successful!');
      console.log('   Content found:', browseResponse.data.content.length);
      console.log('   Total items:', browseResponse.data.pagination.totalItems);
      console.log('   Current page:', browseResponse.data.pagination.currentPage);
    } catch (error) {
      console.log('❌ Browse test failed:', error.response?.data?.error || error.message);
    }
    
    // Test 3: Search functionality
    console.log('\n🔎 Test 3: Testing search...');
    try {
      const searchResponse = await axios.get(`${BASE_URL}/search?q=javascript&limit=3`);
      console.log('✅ Search successful!');
      console.log('   Search query:', searchResponse.data.query);
      console.log('   Results found:', searchResponse.data.results.length);
      console.log('   Total results:', searchResponse.data.total);
    } catch (error) {
      console.log('❌ Search test failed:', error.response?.data?.error || error.message);
    }
    
    // Test 4: Test protected routes (should fail without token)
    console.log('\n🔒 Test 4: Testing protected routes...');
    try {
      await axios.post(`${BASE_URL}/upload`, {
        title: 'Test Content',
        description: 'Test description',
        category: 'technology',
        subject: 'programming',
        difficulty: 'beginner',
        contentType: 'blog',
        contentData: 'Test content data'
      });
      console.log('❌ Upload should have failed without authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Upload correctly rejected without authentication');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      }
    }
    
    console.log('\n🎉 Marketplace API tests completed!');
    console.log('\n📋 Available endpoints:');
    console.log('   GET  /api/marketplace/categories');
    console.log('   GET  /api/marketplace/content');
    console.log('   GET  /api/marketplace/content/:id');
    console.log('   GET  /api/marketplace/search');
    console.log('   POST /api/marketplace/upload (requires auth)');
    console.log('   POST /api/marketplace/content/:id/like (requires auth)');
    console.log('   POST /api/marketplace/content/:id/review (requires auth)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMarketplace();
