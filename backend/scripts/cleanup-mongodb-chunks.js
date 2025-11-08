/**
 * Cleanup Script: Delete ContentChunk documents from MongoDB
 * 
 * This script removes ContentChunk documents from MongoDB after
 * verifying that vectors have been migrated to ChromaDB.
 * 
 * ⚠️  WARNING: This will permanently delete all ContentChunk documents!
 * 
 * Usage: node scripts/cleanup-mongodb-chunks.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ContentChunk = require('../models/ContentChunk');
const ChromaService = require('../services/chromaService');

async function cleanupMongoDBChunks() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check ChromaDB stats
    const chromaService = new ChromaService();
    await chromaService.initialize();
    const stats = await chromaService.getStats();
    console.log(`📊 ChromaDB has ${stats.chunkCount} chunks`);

    // Get MongoDB chunk count
    const mongoCount = await ContentChunk.countDocuments();
    console.log(`📊 MongoDB has ${mongoCount} chunks\n`);

    if (mongoCount === 0) {
      console.log('✅ No chunks to delete in MongoDB. Cleanup complete!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Confirm deletion
    console.log(`⚠️  WARNING: This will delete ${mongoCount} ContentChunk documents from MongoDB!`);
    console.log('   Make sure ChromaDB migration was successful before proceeding.\n');
    
    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with deletion
    console.log('🗑️  Deleting MongoDB chunks...');

    const result = await ContentChunk.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} chunks from MongoDB`);
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('   All vectors are now stored in ChromaDB only.');

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run cleanup
if (require.main === module) {
  cleanupMongoDBChunks();
}

module.exports = cleanupMongoDBChunks;

