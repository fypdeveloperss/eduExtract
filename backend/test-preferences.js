/**
 * Test Script for User Preferences System
 * 
 * This script helps you verify that the tone & style preferences
 * are being applied correctly to AI-generated content.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function testPreferences() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('uid email preferences');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`Found ${users.length} user(s)\n`);
    console.log('='.repeat(80));

    // Display preferences for each user
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}: ${user.email}`);
      console.log('─'.repeat(80));
      
      const prefs = user.preferences || {};
      const tonePrefs = prefs.tonePreferences || {};
      const contentPrefs = prefs.contentPreferences || {};
      
      console.log('\n📊 TONE & STYLE PREFERENCES:');
      console.log(`   Communication Style: ${tonePrefs.communicationStyle || 'academic (default)'}`);
      console.log(`   Complexity Level:    ${tonePrefs.complexityLevel || 'intermediate (default)'}`);
      console.log(`   Language Style:      ${tonePrefs.languageStyle || 'formal (default)'}`);
      
      console.log('\n📝 CONTENT PREFERENCES:');
      console.log(`   Quiz Format:         ${contentPrefs.quizFormat || 'multiple-choice (default)'}`);
      console.log(`   Quiz Questions:      ${contentPrefs.quizQuestions || '10 (default)'}`);
      console.log(`   Summary Length:      ${contentPrefs.summaryLength || 'medium (default)'}`);
      console.log(`   Blog Length:         ${contentPrefs.blogLength || 'medium (default)'}`);
      console.log(`   Flashcard Style:     ${contentPrefs.flashcardStyle || 'simple (default)'}`);
      console.log(`   Presentation Slides: ${contentPrefs.presentationSlides || '10 (default)'}`);
      
      console.log('\n' + '='.repeat(80));
    });

    console.log('\n\n✅ Preferences test complete!\n');
    console.log('🔍 How to verify the system is working:');
    console.log('   1. Change your preferences in the app (Settings → User Preferences)');
    console.log('   2. Generate content (blog, summary, etc.)');
    console.log('   3. Check if the generated content matches your preferences');
    console.log('   4. Try different combinations (Academic vs Casual, Beginner vs Advanced)\n');

  } catch (error) {
    console.error('❌ Error testing preferences:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testPreferences();
