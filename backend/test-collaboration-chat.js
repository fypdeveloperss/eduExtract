// Test collaboration space chat functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test data - replace with valid credentials and space ID
const testConfig = {
  // You'll need to get a valid Firebase token from the frontend
  firebaseToken: 'YOUR_FIREBASE_TOKEN_HERE',
  spaceId: 'YOUR_SPACE_ID_HERE',
  testMessage: 'What content is available in this collaboration space?'
};

async function testCollaborationChat() {
  try {
    console.log('🧪 Testing Collaboration Space Chat...\n');

    // Test the new collaboration chat endpoint
    const chatResponse = await axios.post(
      `${BASE_URL}/api/collaborate/spaces/${testConfig.spaceId}/chat`,
      {
        messages: [
          { role: 'user', content: testConfig.testMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${testConfig.firebaseToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Chat Response Status:', chatResponse.status);
    console.log('✅ Chat Response Data:', JSON.stringify(chatResponse.data, null, 2));

    if (chatResponse.data.success) {
      console.log('\n🎉 Collaboration Space Chat Test PASSED!');
      console.log(`📝 AI Response: ${chatResponse.data.message.substring(0, 100)}...`);
      console.log(`🔍 Session ID: ${chatResponse.data.sessionId}`);
      console.log(`📊 Space Info:`, chatResponse.data.spaceInfo);
    } else {
      console.log('\n❌ Chat Test Failed:', chatResponse.data.error);
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: You need a valid Firebase token to test this endpoint.');
      console.log('   1. Open the frontend at http://localhost:5173');
      console.log('   2. Log in to get a valid token');
      console.log('   3. Update the testConfig.firebaseToken in this script');
    } else if (error.response?.status === 403) {
      console.log('\n💡 Note: Make sure you have access to the collaboration space.');
      console.log('   Update testConfig.spaceId with a valid space ID you have access to.');
    }
  }
}

// Endpoint structure verification
async function verifyEndpointStructure() {
  console.log('\n🔍 Verifying Collaboration Routes...\n');
  
  try {
    // Test health check
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend Health Check:', healthResponse.data);
  } catch (error) {
    console.log('❌ Backend not responding:', error.message);
    return;
  }

  // The actual endpoint test requires authentication
  console.log('\n📋 Expected Endpoint Structure:');
  console.log('   POST /api/collaborate/spaces/:spaceId/chat');
  console.log('   - Requires: Authorization header with Firebase token');
  console.log('   - Body: { messages: [...], sessionId?: string }');
  console.log('   - Returns: { success: boolean, message: string, sessionId: string, spaceInfo: object }');
}

// Run tests
if (require.main === module) {
  console.log('🚀 Collaboration Space Chat Test Suite\n');
  console.log('⚠️  Note: Update testConfig with valid credentials before running chat test.\n');
  
  verifyEndpointStructure();
  
  if (testConfig.firebaseToken !== 'YOUR_FIREBASE_TOKEN_HERE' && 
      testConfig.spaceId !== 'YOUR_SPACE_ID_HERE') {
    testCollaborationChat();
  } else {
    console.log('\n💡 To test the chat functionality:');
    console.log('   1. Update testConfig.firebaseToken with a valid Firebase token');
    console.log('   2. Update testConfig.spaceId with a valid collaboration space ID');
    console.log('   3. Run this script again: node test-collaboration-chat.js');
  }
}

module.exports = { testCollaborationChat, verifyEndpointStructure };