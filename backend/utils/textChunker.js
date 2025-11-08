/**
 * Text Chunker Utility
 * Splits large texts into smaller chunks for embedding and retrieval
 */
class TextChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 800; // Reduced from 1000 to prevent too many chunks
    this.chunkOverlap = options.chunkOverlap || 150; // Reduced overlap
    this.minChunkSize = options.minChunkSize || 100; // Minimum chunk size
    this.maxChunks = options.maxChunks || 50; // Maximum chunks per content item
  }

  /**
   * Split text into chunks
   * @param {string} text - Text to chunk
   * @param {Object} metadata - Optional metadata to attach to each chunk
   * @returns {Array<Object>} Array of chunk objects with text and metadata
   */
  chunkText(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const chunks = [];
    const textLength = text.length;

    // If text is smaller than chunk size, return as single chunk
    if (textLength <= this.chunkSize) {
      return [{
        text: text.trim(),
        chunkIndex: 0,
        startIndex: 0,
        endIndex: textLength,
        ...metadata
      }];
    }

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < textLength && chunks.length < this.maxChunks) {
      let endIndex = Math.min(startIndex + this.chunkSize, textLength);

      // Try to break at sentence boundary (period, exclamation, question mark)
      if (endIndex < textLength) {
        const sentenceEnd = this.findSentenceBoundary(text, endIndex);
        if (sentenceEnd > startIndex + this.minChunkSize) {
          endIndex = sentenceEnd;
        }
      }

      // Extract chunk text
      const chunkText = text.substring(startIndex, endIndex).trim();

      // Only add chunk if it meets minimum size
      if (chunkText.length >= this.minChunkSize) {
        chunks.push({
          text: chunkText,
          chunkIndex: chunkIndex++,
          startIndex,
          endIndex,
          ...metadata
        });
      }

      // Move start index with overlap
      startIndex = endIndex - this.chunkOverlap;
      if (startIndex < 0) startIndex = 0;
      
      // If we've reached max chunks, break
      if (chunks.length >= this.maxChunks) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Find sentence boundary near the given index
   * @param {string} text - Text to search
   * @param {number} index - Index to search around
   * @returns {number} Index of sentence boundary
   */
  findSentenceBoundary(text, index) {
    const searchRange = 100; // Search within 100 characters
    const start = Math.max(0, index - searchRange);
    const end = Math.min(text.length, index + searchRange);

    // Look for sentence endings
    const sentenceEndings = /[.!?]\s+/g;
    let lastMatch = index;
    let match;

    while ((match = sentenceEndings.exec(text.substring(start, end))) !== null) {
      const matchIndex = start + match.index + match[0].length;
      if (matchIndex <= index) {
        lastMatch = matchIndex;
      } else {
        break;
      }
    }

    return lastMatch;
  }

  /**
   * Chunk content based on type
   * @param {*} content - Content to chunk (string, array, object)
   * @param {string} contentType - Type of content (blog, summary, quiz, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Array<Object>} Array of chunks
   */
  chunkContent(content, contentType, metadata = {}) {
    const chunks = [];

    switch (contentType) {
      case 'blog':
      case 'summary':
        // For text content, chunk directly
        if (typeof content === 'string') {
          const textChunks = this.chunkText(content, {
            contentType,
            ...metadata
          });
          chunks.push(...textChunks);
        }
        break;

      case 'quiz':
        // For quiz, chunk each question separately
        if (Array.isArray(content)) {
          content.forEach((item, index) => {
            const questionText = `Question: ${item.question}\nOptions: ${item.options?.join(', ') || 'N/A'}\nAnswer: ${item.answer || 'N/A'}`;
            chunks.push({
              text: questionText,
              chunkIndex: index,
              contentType,
              questionIndex: index,
              ...metadata
            });
          });
        }
        break;

      case 'flashcards':
        // For flashcards, chunk each card separately
        if (Array.isArray(content)) {
          content.forEach((card, index) => {
            const cardText = `Question: ${card.question}\nAnswer: ${card.answer}`;
            chunks.push({
              text: cardText,
              chunkIndex: index,
              contentType,
              cardIndex: index,
              ...metadata
            });
          });
        }
        break;

      case 'slides':
        // For slides, chunk each slide separately
        if (Array.isArray(content)) {
          content.forEach((slide, index) => {
            const slideText = `Title: ${slide.title}\nContent: ${Array.isArray(slide.points) ? slide.points.join('\n') : slide.content || ''}`;
            chunks.push({
              text: slideText,
              chunkIndex: index,
              contentType,
              slideIndex: index,
              ...metadata
            });
          });
        }
        break;

      default:
        // For unknown types, convert to string and chunk
        const textContent = typeof content === 'string' 
          ? content 
          : JSON.stringify(content);
        const defaultChunks = this.chunkText(textContent, {
          contentType,
          ...metadata
        });
        chunks.push(...defaultChunks);
    }

    return chunks;
  }
}

module.exports = TextChunker;

