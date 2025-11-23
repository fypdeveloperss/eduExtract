const CollaborationSpace = require('./models/CollaborationSpace');
const JoinRequest = require('./models/JoinRequest');
const ChangeRequest = require('./models/ChangeRequest');
const SharedContent = require('./models/SharedContent');
const mongoose = require('mongoose');
require('dotenv').config();

async function updateAllSpaceStats() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const spaces = await CollaborationSpace.find();
    console.log(`Found ${spaces.length} spaces to update`);
    
    for (const space of spaces) {
      console.log(`\nUpdating stats for space: ${space.title}`);
      
      // Calculate total collaborators (active only)
      const totalCollaborators = space.collaborators.filter(c => c.status === 'active').length;
      
      // Calculate total content items in this space
      const totalContent = await SharedContent.countDocuments({
        collaborationSpaceId: space._id
      });
      
      // Calculate total views across all content in this space
      const contentWithViews = await SharedContent.find({
        collaborationSpaceId: space._id
      }, 'stats.views');
      
      const totalViews = contentWithViews.reduce((total, content) => {
        return total + (content.stats?.views || 0);
      }, 0);

      // Calculate pending join requests count
      const pendingJoinRequests = await JoinRequest.countDocuments({
        spaceId: space._id,
        status: 'pending'
      });

      // Calculate pending change requests count
      const pendingChangeRequests = await ChangeRequest.countDocuments({
        collaborationSpaceId: space._id,
        status: 'pending'
      });
      
      console.log(`  - Total Collaborators: ${totalCollaborators}`);
      console.log(`  - Total Content: ${totalContent}`);
      console.log(`  - Total Views: ${totalViews}`);
      console.log(`  - Pending Join Requests: ${pendingJoinRequests}`);
      console.log(`  - Pending Change Requests: ${pendingChangeRequests}`);
      
      // Update space stats
      const newStats = {
        ...space.stats,
        totalCollaborators,
        totalContent,
        totalViews,
        pendingJoinRequests,
        pendingChangeRequests,
        lastActivity: space.stats?.lastActivity || space.updatedAt || space.createdAt
      };
      
      console.log(`  New stats object: ${JSON.stringify(newStats, null, 2)}`);
      space.stats = newStats;
      
      // Save the updated stats
      const saveResult = await space.save();
      console.log(`  ✅ Updated stats for ${space.title}. Save result ID: ${saveResult._id}`);
      console.log(`  Saved stats: ${JSON.stringify(saveResult.stats, null, 2)}`);
    }
    
    console.log('\n🎉 All space stats updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAllSpaceStats();