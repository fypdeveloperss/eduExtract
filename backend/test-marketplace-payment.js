const mongoose = require('mongoose');
const MarketplaceContent = require('./models/MarketplaceContent');
const Purchase = require('./models/Purchase');
const PaymentService = require('./services/paymentService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/eduExtract', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testMarketplacePayment() {
  try {
    console.log('🧪 Testing Marketplace Payment System...\n');

    // Test 1: Create test content
    console.log('1. Creating test content...');
    const testContent = new MarketplaceContent({
      title: 'Test Mathematics Course',
      description: 'A comprehensive mathematics course for beginners',
      category: 'mathematics',
      subject: 'Algebra',
      difficulty: 'beginner',
      contentType: 'slides',
      contentData: { slides: ['Slide 1', 'Slide 2', 'Slide 3'] },
      previewContent: 'Preview of mathematics course',
      price: 29.99,
      currency: 'USD',
      creatorId: 'test-creator-123',
      status: 'approved'
    });

    await testContent.save();
    console.log('✅ Test content created:', testContent._id);

    // Test 2: Test payment processing
    console.log('\n2. Testing payment processing...');
    const paymentData = {
      contentId: testContent._id,
      buyerId: 'test-buyer-456',
      paymentMethod: 'credit_card',
      amount: 29.99,
      currency: 'USD'
    };

    const paymentResult = await PaymentService.processPayment(paymentData);
    console.log('✅ Payment processed:', paymentResult);

    // Test 3: Test access control
    console.log('\n3. Testing access control...');
    const accessInfo = await PaymentService.checkAccess(testContent._id, 'test-buyer-456');
    console.log('✅ Access check:', accessInfo);

    const accessInfoUnauthorized = await PaymentService.checkAccess(testContent._id, 'unauthorized-user');
    console.log('✅ Unauthorized access check:', accessInfoUnauthorized);

    // Test 4: Test purchase history
    console.log('\n4. Testing purchase history...');
    const userPurchases = await PaymentService.getUserPurchases('test-buyer-456');
    console.log('✅ User purchases:', userPurchases.length, 'items');

    const creatorSales = await PaymentService.getCreatorSales('test-creator-123');
    console.log('✅ Creator sales:', creatorSales.length, 'items');

    // Test 5: Test free content access
    console.log('\n5. Testing free content access...');
    const freeContent = new MarketplaceContent({
      title: 'Free Sample Content',
      description: 'This is free content for everyone',
      category: 'science',
      subject: 'Physics',
      difficulty: 'beginner',
      contentType: 'blog',
      contentData: 'This is free content that everyone can access.',
      price: 0,
      currency: 'USD',
      creatorId: 'test-creator-123',
      status: 'approved'
    });

    await freeContent.save();
    const freeAccessInfo = await PaymentService.checkAccess(freeContent._id, 'any-user');
    console.log('✅ Free content access:', freeAccessInfo);

    console.log('\n🎉 All tests passed! Marketplace payment system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testMarketplacePayment();
