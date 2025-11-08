/**
 * Migration Script: Move Vectors from MongoDB to ChromaDB
 * 
 * This script migrates existing ContentChunk documents from MongoDB
 * to ChromaDB for better vector search performance.
 * 
 * Usage: node scripts/migrate-to-chromadb.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ChromaService = require('../services/chromaService');
const ContentChunk = require('../models/ContentChunk');

async function migrateToChromaDB() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Initialize ChromaDB
    const chromaService = new ChromaService();
    await chromaService.initialize();
    console.log('✅ ChromaDB initialized\n');

    // Get all chunks from MongoDB
    const chunks = await ContentChunk.find({}).lean();
    console.log(`📦 Found ${chunks.length} chunks in MongoDB to migrate\n`);

    if (chunks.length === 0) {
      console.log('✅ No chunks to migrate. Migration complete!');
      await mongoose.disconnect();
      process.exit(0);
    }

    let migrated = 0;
    let failed = 0;
    const batchSize = 50; // Process in batches

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      try {
        // Prepare chunks for ChromaDB
        const chunksForChroma = batch.map(chunk => ({
          userId: chunk.userId,
          contentId: chunk.contentId,
          contentType: chunk.contentType,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          embedding: chunk.embedding,
          metadata: {
            ...chunk.metadata,
            migratedFromMongoDB: true,
            migratedAt: new Date().toISOString()
          }
        }));

        // Add to ChromaDB
        await chromaService.addChunks(chunksForChroma);
        migrated += batch.length;
        
        console.log(`✅ Migrated batch ${Math.floor(i/batchSize) + 1}: ${migrated}/${chunks.length} chunks`);
      } catch (error) {
        console.error(`❌ Error migrating batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        failed += batch.length;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${chunks.length}\n`);

    if (migrated > 0) {
      // Get ChromaDB stats
      const stats = await chromaService.getStats();
      console.log(`📈 ChromaDB Stats:`);
      console.log(`   Collection: ${stats.collectionName}`);
      console.log(`   Total Chunks: ${stats.chunkCount}\n`);
      
      console.log('🎉 Migration completed successfully!');
      console.log('\n⚠️  Note: MongoDB ContentChunk documents are still present.');
      console.log('   You can delete them after verifying ChromaDB is working correctly.');
      console.log('   To delete MongoDB chunks, run: node scripts/cleanup-mongodb-chunks.js');
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  migrateToChromaDB();
}

module.exports = migrateToChromaDB;

