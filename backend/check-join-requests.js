const JoinRequest = require('./models/JoinRequest');
const CollaborationSpace = require('./models/CollaborationSpace');
const mongoose = require('mongoose');
require('dotenv').config();

async function checkJoinRequests() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Check pending join requests
    const joinRequests = await JoinRequest.find({ status: 'pending' }).populate('spaceId', 'title');
    console.log('\n📋 Pending Join Requests:');
    console.log(JSON.stringify(joinRequests, null, 2));
    
    // Check spaces with their current stats
    const spaces = await CollaborationSpace.find();
    console.log('\n🏢 All Spaces and their stats:');
    spaces.forEach(space => {
      console.log(`Space: ${space.title}`);
      console.log(`  Owner: ${space.ownerId}`);
      console.log(`  Full Space Object: ${JSON.stringify(space.toObject(), null, 2)}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkJoinRequests();