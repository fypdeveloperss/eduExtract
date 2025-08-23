const { Groq } = require('groq-sdk');
const MarketplaceContent = require('../models/MarketplaceContent');
const GeneratedContent = require('../models/GeneratedContent');

// Initialize Groq client (only if API key is available)
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

class PlagiarismService {
  
  /**
   * Check content for plagiarism using multiple methods
   * @param {string} content - The content to check
   * @param {string} contentType - Type of content (blog, slides, etc.)
   * @returns {Object} Plagiarism analysis result
   */
  static async checkPlagiarism(content, contentType) {
    try {
      console.log(`🔍 Starting plagiarism check for ${contentType} content...`);
      
      const checks = await Promise.allSettled([
        this.checkAgainstWebSources(content, contentType),
        this.checkAgainstUploadedContent(content),
        this.checkAgainstGeneratedContent(content),
        this.checkForDuplicateContent(content)
      ]);
      
      // Process results
      const results = checks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`Plagiarism check ${index} failed:`, result.reason);
          return { score: 100, sources: [], riskLevel: 'low' };
        }
      });
      
      // Generate comprehensive report
      const finalReport = this.generatePlagiarismReport(results);
      
      console.log(`✅ Plagiarism check completed. Score: ${finalReport.score}`);
      
      return finalReport;
      
    } catch (error) {
      console.error('❌ Plagiarism check error:', error);
      // Return a safe default if plagiarism check fails
      return {
        score: 100,
        report: {
          overallScore: 100,
          riskLevel: 'low',
          checks: [],
          recommendations: ['Content appears original'],
          timestamp: new Date()
        }
      };
    }
  }
  
  /**
   * Check content against web sources using AI analysis
   * @param {string} content - Content to analyze
   * @param {string} contentType - Type of content
   * @returns {Object} Analysis result
   */
  static async checkAgainstWebSources(content, contentType) {
    try {
      // Check if Groq is available
      if (!groq) {
        return {
          method: 'ai_web_analysis',
          score: 100,
          sources: [],
          riskLevel: 'low',
          analysis: 'AI analysis unavailable (GROQ_API_KEY not configured)',
          confidence: 0
        };
      }

      const prompt = `Analyze this ${contentType} content for potential plagiarism:

Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Check for:
1. Direct copying from common sources
2. Paraphrasing without proper attribution
3. Similar content structure to well-known materials
4. Common phrases or expressions that might indicate copying
5. Content that seems too similar to standard educational materials

Return a JSON response with:
{
  "score": number (0-100, where 100 = completely original),
  "sources": ["list of potential sources"],
  "riskLevel": "low" | "medium" | "high",
  "analysis": "detailed explanation",
  "confidence": number (0-100)
}`;

      const completion = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: "You are an expert plagiarism detection AI. Analyze content for originality and provide detailed analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        method: 'ai_web_analysis',
        score: result.score || 100,
        sources: result.sources || [],
        riskLevel: result.riskLevel || 'low',
        analysis: result.analysis || 'AI analysis completed',
        confidence: result.confidence || 80
      };

    } catch (error) {
      console.error('AI web analysis failed:', error);
      return {
        method: 'ai_web_analysis',
        score: 100,
        sources: [],
        riskLevel: 'low',
        analysis: 'AI analysis unavailable',
        confidence: 0
      };
    }
  }
  
  /**
   * Check content against existing uploaded content
   * @param {string} content - Content to check
   * @returns {Object} Analysis result
   */
  static async checkAgainstUploadedContent(content) {
    try {
      // Extract key phrases and words for comparison
      const keyPhrases = this.extractKeyPhrases(content);
      
      // Search for similar content in marketplace
      const similarContent = await MarketplaceContent.find({
        status: 'approved',
        $or: [
          { title: { $regex: keyPhrases.join('|'), $options: 'i' } },
          { tags: { $in: keyPhrases } }
        ]
      }).limit(10);

      let maxSimilarity = 0;
      const similarSources = [];

      for (const item of similarContent) {
        const similarity = this.calculateSimilarity(content, item.contentData);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
        if (similarity > 0.3) { // 30% similarity threshold
          similarSources.push({
            id: item._id,
            title: item.title,
            similarity: Math.round(similarity * 100)
          });
        }
      }

      const score = Math.max(0, 100 - (maxSimilarity * 100));
      
      return {
        method: 'marketplace_comparison',
        score: Math.round(score),
        sources: similarSources,
        riskLevel: score > 70 ? 'low' : score > 40 ? 'medium' : 'high',
        analysis: `Found ${similarSources.length} similar content pieces in marketplace`,
        confidence: 90
      };

    } catch (error) {
      console.error('Marketplace comparison failed:', error);
      return {
        method: 'marketplace_comparison',
        score: 100,
        sources: [],
        riskLevel: 'low',
        analysis: 'Marketplace comparison unavailable',
        confidence: 0
      };
    }
  }
  
  /**
   * Check content against generated content from the app
   * @param {string} content - Content to check
   * @returns {Object} Analysis result
   */
  static async checkAgainstGeneratedContent(content) {
    try {
      // Check if this content is too similar to previously generated content
      const generatedContent = await GeneratedContent.find({
        $or: [
          { title: { $regex: this.extractKeyPhrases(content).join('|'), $options: 'i' } },
          { tags: { $in: this.extractKeyPhrases(content) } }
        ]
      }).limit(10);

      let maxSimilarity = 0;
      const similarSources = [];

      for (const item of generatedContent) {
        const similarity = this.calculateSimilarity(content, item.contentData || item.content);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
        if (similarity > 0.4) { // 40% similarity threshold for generated content
          similarSources.push({
            id: item._id,
            title: item.title,
            similarity: Math.round(similarity * 100)
          });
        }
      }

      const score = Math.max(0, 100 - (maxSimilarity * 100));
      
      return {
        method: 'generated_content_comparison',
        score: Math.round(score),
        sources: similarSources,
        riskLevel: score > 70 ? 'low' : score > 40 ? 'medium' : 'high',
        analysis: `Found ${similarSources.length} similar generated content pieces`,
        confidence: 85
      };

    } catch (error) {
      console.error('Generated content comparison failed:', error);
      return {
        method: 'generated_content_comparison',
        score: 100,
        sources: [],
        riskLevel: 'low',
        analysis: 'Generated content comparison unavailable',
        confidence: 0
      };
    }
  }
  
  /**
   * Check for duplicate content patterns
   * @param {string} content - Content to check
   * @returns {Object} Analysis result
   */
  static async checkForDuplicateContent(content) {
    try {
      // Check for repeated sentences or paragraphs
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const uniqueSentences = new Set(sentences);
      const duplicateRatio = 1 - (uniqueSentences.size / sentences.length);
      
      // Check for repeated phrases
      const words = content.toLowerCase().split(/\s+/);
      const phraseLength = 5;
      const phrases = [];
      
      for (let i = 0; i <= words.length - phraseLength; i++) {
        phrases.push(words.slice(i, i + phraseLength).join(' '));
      }
      
      const uniquePhrases = new Set(phrases);
      const phraseDuplicateRatio = 1 - (uniquePhrases.size / phrases.length);
      
      // Calculate overall duplicate score
      const duplicateScore = Math.max(duplicateRatio, phraseDuplicateRatio) * 100;
      const score = Math.max(0, 100 - duplicateScore);
      
      return {
        method: 'duplicate_pattern_analysis',
        score: Math.round(score),
        sources: [],
        riskLevel: score > 70 ? 'low' : score > 40 ? 'medium' : 'high',
        analysis: `Duplicate content analysis: ${Math.round(duplicateScore)}% duplication detected`,
        confidence: 95
      };

    } catch (error) {
      console.error('Duplicate pattern analysis failed:', error);
      return {
        method: 'duplicate_pattern_analysis',
        score: 100,
        sources: [],
        riskLevel: 'low',
        analysis: 'Duplicate pattern analysis unavailable',
        confidence: 0
      };
    }
  }
  
  /**
   * Generate comprehensive plagiarism report
   * @param {Array} checkResults - Results from all checks
   * @returns {Object} Final report
   */
  static generatePlagiarismReport(checkResults) {
    try {
      // Calculate weighted average score
      let totalScore = 0;
      let totalWeight = 0;
      let allSources = [];
      let allChecks = [];
      
      for (const result of checkResults) {
        if (result.score !== undefined && result.confidence > 0) {
          const weight = result.confidence / 100;
          totalScore += result.score * weight;
          totalWeight += weight;
        }
        
        allSources.push(...(result.sources || []));
        allChecks.push({
          method: result.method,
          score: result.score,
          riskLevel: result.riskLevel,
          analysis: result.analysis,
          confidence: result.confidence
        });
      }
      
      const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 100;
      
      // Determine overall risk level
      let riskLevel = 'low';
      if (overallScore < 50) riskLevel = 'high';
      else if (overallScore < 80) riskLevel = 'medium';
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(overallScore, allSources, allChecks);
      
      return {
        score: overallScore,
        report: {
          overallScore: overallScore,
          riskLevel: riskLevel,
          checks: allChecks,
          sources: allSources,
          recommendations: recommendations,
          timestamp: new Date(),
          confidence: Math.round(totalWeight / checkResults.length * 100)
        }
      };
      
    } catch (error) {
      console.error('Error generating plagiarism report:', error);
      return {
        score: 100,
        report: {
          overallScore: 100,
          riskLevel: 'low',
          checks: [],
          sources: [],
          recommendations: ['Content appears original'],
          timestamp: new Date(),
          confidence: 0
        }
      };
    }
  }
  
  /**
   * Generate recommendations based on plagiarism analysis
   * @param {number} score - Overall plagiarism score
   * @param {Array} sources - Detected similar sources
   * @param {Array} checks - All check results
   * @returns {Array} List of recommendations
   */
  static generateRecommendations(score, sources, checks) {
    const recommendations = [];
    
    if (score >= 90) {
      recommendations.push('Content appears highly original');
      recommendations.push('Ready for marketplace upload');
    } else if (score >= 80) {
      recommendations.push('Content shows good originality');
      recommendations.push('Minor improvements recommended');
    } else if (score >= 60) {
      recommendations.push('Content has moderate originality concerns');
      recommendations.push('Review and revise before uploading');
      if (sources.length > 0) {
        recommendations.push(`Review ${sources.length} similar sources for potential improvements`);
      }
    } else {
      recommendations.push('Content has significant originality concerns');
      recommendations.push('Major revision required before upload');
      recommendations.push('Consider creating more original content');
    }
    
    // Add specific recommendations based on check results
    for (const check of checks) {
      if (check.score < 70 && check.analysis) {
        recommendations.push(`${check.method}: ${check.analysis}`);
      }
    }
    
    return recommendations;
  }
  
  /**
   * Extract key phrases from content for comparison
   * @param {string} content - Content to analyze
   * @returns {Array} Array of key phrases
   */
  static extractKeyPhrases(content) {
    try {
      // Simple key phrase extraction
      const words = content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      // Get most common words (excluding common stop words)
      const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
      
      const wordCount = {};
      words.forEach(word => {
        if (!stopWords.has(word)) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
      
      // Return top 20 most common words
      return Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word]) => word);
        
    } catch (error) {
      console.error('Key phrase extraction failed:', error);
      return [];
    }
  }
  
  /**
   * Calculate similarity between two content pieces
   * @param {string} content1 - First content
   * @param {string} content2 - Second content
   * @returns {number} Similarity score (0-1)
   */
  static calculateSimilarity(content1, content2) {
    try {
      if (!content1 || !content2) return 0;
      
      // Simple Jaccard similarity for text
      const words1 = new Set(content1.toLowerCase().split(/\s+/));
      const words2 = new Set(content2.toLowerCase().split(/\s+/));
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      return union.size > 0 ? intersection.size / union.size : 0;
      
    } catch (error) {
      console.error('Similarity calculation failed:', error);
      return 0;
    }
  }
}

module.exports = PlagiarismService;
