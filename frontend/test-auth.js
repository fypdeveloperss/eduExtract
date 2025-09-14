// Test script to verify Firebase authentication
// Run this in the browser console when logged in

async function testFirebaseAuth() {
  console.log('🔍 Testing Firebase Authentication...');
  
  try {
    // Import Firebase
    const { auth } = await import('./src/config/firebase.js');
    
    // Check if user is logged in
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    console.log('✅ User is logged in:', user.email);
    
    // Test getting ID token
    console.log('🔑 Getting ID token...');
    const token = await user.getIdToken(true);
    console.log('✅ Token obtained, length:', token.length);
    
    // Verify token structure
    const tokenParts = token.split('.');
    console.log('📋 Token structure check:');
    console.log('  - Parts:', tokenParts.length, '(should be 3)');
    
    if (tokenParts.length === 3) {
      // Decode header
      const header = JSON.parse(atob(tokenParts[0]));
      console.log('  - Header contains kid:', !!header.kid, '✅');
      console.log('  - Algorithm:', header.alg);
      
      // Decode payload
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('  - Issuer:', payload.iss);
      console.log('  - Audience:', payload.aud);
      console.log('  - Expires:', new Date(payload.exp * 1000).toLocaleString());
    }
    
    // Test API call
    console.log('🌐 Testing API call...');
    const response = await fetch('/api/auth/debug-token', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API call successful');
      console.log('  - User UID:', result.user.uid);
      console.log('  - Token expires in:', result.tokenInfo.time_remaining, 'seconds');
    } else {
      const error = await response.json();
      console.error('❌ API call failed:', error);
    }
    
    // Test auth utility
    console.log('🛠️ Testing auth utility...');
    try {
      const { authenticatedFetch } = await import('./src/utils/auth.js');
      const utilResponse = await authenticatedFetch('/api/auth/debug-token');
      
      if (utilResponse.ok) {
        console.log('✅ Auth utility working');
      } else {
        console.error('❌ Auth utility failed');
      }
    } catch (utilError) {
      console.error('❌ Auth utility error:', utilError.message);
    }
    
    console.log('🎉 Authentication test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFirebaseAuth();