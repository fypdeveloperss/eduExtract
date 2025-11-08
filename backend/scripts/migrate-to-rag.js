/**
 * Migration Script: Process Existing Content for RAG
 * 
 * This script processes all existing GeneratedContent entries to create
 * embeddings and chunks for RAG functionality.
 * 
 * Usage: node scripts/migrate-to-rag.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const RAGService = require('../services/ragService');
const GeneratedContent = require('../models/GeneratedContent');

async function migrateToRAG() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Initialize RAG service
    const ragService = new RAGService();

    // Get all content
    const contents = await GeneratedContent.find({}).lean();
    console.log(`\n📦 Found ${contents.length} content items to process\n`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const content of contents) {
      try {
        // Check if content has data
        const contentData = content.contentData || content.content;
        if (!contentData) {
          console.log(`⏭️  Skipping ${content._id} (no content data)`);
          skipped++;
          continue;
        }

        // Process content for RAG
        console.log(`Processing ${content.type}: ${content.title || content._id}...`);
        await ragService.processContent(
          content.userId,
          content._id,
          content.type,
          contentData,
          {
            url: content.url || null,
            title: content.title,
            migrated: true,
            migratedAt: new Date()
          }
        );

        processed++;
        console.log(`✅ Processed ${content._id} (${processed}/${contents.length})`);
      } catch (error) {
        console.error(`❌ Error processing ${content._id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${contents.length}\n`);

    if (processed > 0) {
      console.log('🎉 Migration completed successfully!');
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
  migrateToRAG();
}

module.exports = migrateToRAG;

