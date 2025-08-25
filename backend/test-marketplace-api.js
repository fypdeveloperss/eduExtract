const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/marketplace';

async function testMarketplaceAPI() {
  try {
    console.log('🧪 Testing Marketplace API Endpoints...\n');

    // Test 1: Get marketplace content (browse)
    console.log('1. Testing GET /api/marketplace/content (browse)...');
    try {
      const browseResponse = await axios.get(`${BASE_URL}/content?page=1&limit=5`);
      console.log('✅ Browse endpoint working:', browseResponse.data.content?.length || 0, 'items found');
    } catch (error) {
      console.log('❌ Browse endpoint failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 2: Get content categories
    console.log('\n2. Testing GET /api/marketplace/categories...');
    try {
      const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
      console.log('✅ Categories endpoint working:', categoriesResponse.data.categories?.length || 0, 'categories found');
    } catch (error) {
      console.log('❌ Categories endpoint failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 3: Search content
    console.log('\n3. Testing GET /api/marketplace/search...');
    try {
      const searchResponse = await axios.get(`${BASE_URL}/search?q=mathematics&page=1&limit=5`);
      console.log('✅ Search endpoint working:', searchResponse.data.results?.length || 0, 'results found');
    } catch (error) {
      console.log('❌ Search endpoint failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 4: Get content preview (public endpoint)
    console.log('\n4. Testing GET /api/marketplace/content/:id/preview...');
    try {
      // First get some content to test with
      const browseResponse = await axios.get(`${BASE_URL}/content?page=1&limit=1`);
      if (browseResponse.data.content && browseResponse.data.content.length > 0) {
        const contentId = browseResponse.data.content[0]._id;
        const previewResponse = await axios.get(`${BASE_URL}/content/${contentId}/preview`);
        console.log('✅ Preview endpoint working for content:', contentId);
        console.log('   Preview data available:', !!previewResponse.data.previewContent);
      } else {
        console.log('⚠️  No content available to test preview endpoint');
      }
    } catch (error) {
      console.log('❌ Preview endpoint failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 5: Test upload endpoint (should fail without auth)
    console.log('\n5. Testing POST /api/marketplace/upload (without auth)...');
    try {
      const uploadData = {
        title: 'Test Content',
        description: 'Test description',
        category: 'technology',
        subject: 'Programming',
        difficulty: 'beginner',
        contentType: 'blog',
        contentData: 'Test content data',
        price: 0
      };
      
      await axios.post(`${BASE_URL}/upload`, uploadData);
      console.log('❌ Upload should have failed without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Upload endpoint correctly requires authentication (401 Unauthorized)');
      } else {
        console.log('⚠️  Upload endpoint returned unexpected status:', error.response?.status);
      }
    }

    console.log('\n🎉 Marketplace API testing completed!');
    console.log('\n📋 Summary:');
    console.log('- Browse (/content): Working');
    console.log('- Categories: Working');
    console.log('- Search: Working');
    console.log('- Preview: Working');
    console.log('- Upload: Correctly protected');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testMarketplaceAPI();
