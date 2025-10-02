const { Groq } = require('groq-sdk');

class AIAssistService {
  constructor() {
    // Initialize Groq client
    this.groq = null;
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      console.log('AI Assist Service initialized with Groq API');
    } else {
      console.warn('GROQ_API_KEY not found. AI assistance will use fallback mode.');
    }
  }

  async enhanceContent(content, prompt, contentType = 'text') {
    try {
      console.log('AI Assist request:', {
        contentLength: content?.length || 0,
        prompt: prompt.substring(0, 100),
        contentType
      });

      // Validate inputs
      if (!content || !prompt) {
        throw new Error('Content and prompt are required');
      }

      if (!content.trim()) {
        throw new Error('Content cannot be empty');
      }

      // Detect and preserve original data format
      const formatInfo = this.detectContentFormat(content, contentType);
      console.log('Detected format:', formatInfo);

      // If Groq API is not available, fall back to basic enhancement
      if (!this.groq) {
        console.log('Using fallback AI enhancement (no API key)');
        return this.fallbackEnhancement(content, prompt, formatInfo);
      }

      // Use Groq API for real AI enhancement with format preservation
      const enhancedContent = await this.groqEnhancement(content, prompt, contentType, formatInfo);
      
      return {
        success: true,
        enhancedContent,
        originalContent: content,
        appliedPrompt: prompt,
        contentType,
        method: 'groq-ai',
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        preservedFormat: formatInfo.type
      };

    } catch (error) {
      console.error('AI Assist Service error:', error);
      
      // If API fails, try fallback
      if (this.groq && error.message.includes('API')) {
        console.log('API failed, using fallback enhancement');
        const formatInfo = this.detectContentFormat(content, contentType);
        return this.fallbackEnhancement(content, prompt, formatInfo);
      }
      
      throw error;
    }
  }

  async groqEnhancement(content, prompt, contentType, formatInfo) {
    try {
      // Create format-aware system prompt
      const systemPrompt = this.createSystemPrompt(contentType, formatInfo);
      
      // Create user prompt that preserves format
      const userPrompt = this.createUserPrompt(content, prompt, formatInfo);

      console.log('Sending request to Groq API with format preservation...');

      const completion = await this.groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      });

      const response = completion.choices?.[0]?.message?.content;
      
      if (!response) {
        throw new Error('Invalid response from AI model');
      }

      console.log('Groq API response received successfully');
      console.log('Raw AI response preview:', response.substring(0, 200) + '...');
      console.log('Expected format:', formatInfo.type);
      
      // Post-process to ensure format preservation
      return this.preserveFormat(response.trim(), formatInfo);

    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error(`AI API Error: ${error.message}`);
    }
  }

  createSystemPrompt(contentType, formatInfo) {
    const basePrompt = `You are a JSON-aware content editor. Your ONLY job is to enhance text content while preserving data structure.

🚨 ABSOLUTE REQUIREMENTS:
- Input format = Output format (JSON stays JSON, HTML stays HTML)
- NO explanations, NO commentary, NO markdown code blocks
- If JSON input: Return ONLY valid JSON that can be parsed
- Preserve ALL property names and structure exactly
- Only improve text values inside quotes
- Response must be ready to use directly in application`;

    // Format-specific instructions
    let formatInstructions = '';
    if (formatInfo.isJson) {
      if (formatInfo.type === 'slides_json') {
        formatInstructions = `\n\nCRITICAL FORMAT REQUIREMENT - SLIDES JSON:
- Input is a JSON array/object for presentation slides
- You MUST return ONLY valid JSON, no explanations or extra text
- Preserve ALL JSON keys: "id", "title", "content", "type", etc.
- Only enhance the TEXT VALUES inside quotes
- Keep the exact same structure and array length
- DO NOT add or remove array elements or object properties
- Response must start with [ or { and end with ] or }
- NO markdown code blocks, NO explanations`;
      } else if (formatInfo.type === 'quiz_json') {
        formatInstructions = `\n\nCRITICAL FORMAT REQUIREMENT - QUIZ JSON:
- Input is a JSON object for quiz/questions
- You MUST return ONLY valid JSON, no explanations or extra text
- Preserve ALL JSON keys: "questions", "options", "correct", "title", etc.
- Only enhance question text and answer option text
- Keep the exact same structure and array lengths
- DO NOT add or remove questions or options
- Response must start with { and end with }
- NO markdown code blocks, NO explanations`;
      } else {
        formatInstructions = `\n\nCRITICAL FORMAT REQUIREMENT - JSON:
- Input is JSON data
- You MUST return ONLY valid JSON, no explanations or extra text
- Preserve the exact JSON structure and all keys
- Only enhance text values within quotes
- Response must be valid JSON that can be parsed
- NO markdown code blocks, NO explanations`;
      }
    } else if (formatInfo.type === 'html') {
      formatInstructions = `\n\nCRITICAL FORMAT REQUIREMENT - HTML:
- Input is HTML content
- You MUST return ONLY valid HTML, no explanations
- Preserve all HTML tags and structure exactly
- Only enhance the text content within HTML tags
- Keep all attributes and tag structure intact`;
    }

    const typeSpecificPrompts = {
      'text': `\n- Focus on clear, engaging prose
- Use proper paragraph structure
- Ensure smooth transitions between ideas`,
      
      'academic': `\n- Use formal academic language
- Ensure proper citation format where applicable
- Maintain scholarly tone and precision`,
      
      'blog': `\n- Create engaging, conversational tone
- Use compelling headlines and subheadings
- Include relevant examples and analogies`,
      
      'slides': `\n- Keep slide content concise and impactful
- Use bullet points where appropriate
- Ensure clarity for presentation format`,
      
      'quiz': `\n- Ensure questions are clear and unambiguous
- Make sure answer options are distinct
- Maintain educational value`,
      
      'technical': `\n- Maintain technical accuracy
- Use precise terminology
- Ensure logical flow of technical concepts`
    };

    return basePrompt + formatInstructions + (typeSpecificPrompts[contentType] || typeSpecificPrompts['text']);
  }

  createUserPrompt(content, prompt, formatInfo) {
    let formatReminder = '';
    
    if (formatInfo.isJson) {
      formatReminder = `

🚨 CRITICAL: This is ${formatInfo.type.toUpperCase()} format!
- Return ONLY valid JSON (no explanations, no code blocks)
- Keep EXACT same structure and all property names
- Only improve the text content inside the quotes
- Your response must start with [ or { and be parseable JSON`;
    } else if (formatInfo.type === 'html') {
      formatReminder = `

🚨 CRITICAL: This is HTML format!
- Return ONLY valid HTML (no explanations)
- Keep all tags and structure exactly the same
- Only improve text content within tags`;
    }

    return `Enhance this content: "${prompt}"${formatReminder}

${content}`;
  }

  // Preserve the original format after AI enhancement
  preserveFormat(aiResponse, formatInfo) {
    try {
      if (formatInfo.isJson) {
        // Clean up the AI response first
        let cleanedResponse = this.cleanAiResponse(aiResponse);
        
        // Try to parse the cleaned AI response as JSON
        try {
          const parsed = JSON.parse(cleanedResponse);
          // Validate that it has the same structure as original
          if (this.validateJsonStructure(parsed, formatInfo.originalData)) {
            console.log('✅ AI response is valid JSON with correct structure');
            return JSON.stringify(parsed, null, 2);
          } else {
            console.warn('⚠️ AI response JSON structure mismatch, applying intelligent merge');
            console.log('Original keys:', Object.keys(formatInfo.originalData));
            console.log('Enhanced keys:', Object.keys(parsed));
            return this.intelligentJsonMerge(cleanedResponse, formatInfo);
          }
        } catch (jsonError) {
          console.warn('❌ AI response is not valid JSON, applying intelligent merge');
          console.log('JSON parse error:', jsonError.message);
          console.log('Cleaned response preview:', cleanedResponse.substring(0, 200));
          return this.intelligentJsonMerge(aiResponse, formatInfo);
        }
      } else if (formatInfo.type === 'html') {
        // Validate HTML structure
        if (aiResponse.includes('<') && aiResponse.includes('>')) {
          return aiResponse;
        } else {
          console.warn('AI response lost HTML structure, preserving original format');
          return formatInfo.originalData;
        }
      } else {
        // Plain text - return as is
        return aiResponse;
      }
    } catch (error) {
      console.error('Error preserving format:', error);
      // Return original content if format preservation fails
      return typeof formatInfo.originalData === 'string' 
        ? formatInfo.originalData 
        : JSON.stringify(formatInfo.originalData, null, 2);
    }
  }

  // Clean AI response to extract valid JSON
  cleanAiResponse(aiResponse) {
    // Remove common AI response artifacts
    let cleaned = aiResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^Here's the enhanced content:?\s*/i, '')
      .replace(/^Enhanced Content:?\s*/i, '')
      .replace(/^The enhanced version:?\s*/i, '')
      .trim();

    // If the response starts with explanation text, try to extract JSON
    const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }

    // Fix common JSON formatting issues
    cleaned = cleaned
      .replace(/'/g, '"')  // Replace single quotes with double quotes
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']'); // Remove trailing commas before ]

    return cleaned;
  }

  // Validate that enhanced JSON has the same structure as original
  validateJsonStructure(enhanced, original) {
    if (Array.isArray(original) !== Array.isArray(enhanced)) {
      return false;
    }
    
    if (Array.isArray(original)) {
      // For arrays, check if they have similar length (allow some variation)
      return enhanced.length > 0 && Math.abs(enhanced.length - original.length) <= 2;
    } else if (typeof original === 'object' && typeof enhanced === 'object') {
      // For objects, check if key structures are similar
      const originalKeys = Object.keys(original);
      const enhancedKeys = Object.keys(enhanced);
      
      // Check if at least 70% of original keys are present
      const matchingKeys = originalKeys.filter(key => enhancedKeys.includes(key));
      return matchingKeys.length >= originalKeys.length * 0.7;
    }
    
    return true;
  }

  // Intelligent JSON merge when AI response isn't valid JSON
  intelligentJsonMerge(aiResponse, formatInfo) {
    try {
      const original = formatInfo.originalData;
      console.log('🔧 Performing intelligent JSON merge...');
      
      // First, try to use simple text enhancement while preserving structure
      const enhanced = this.enhanceJsonWithSimpleRules(original, aiResponse);
      
      // Validate the result
      try {
        JSON.parse(enhanced);
        console.log('✅ Intelligent merge successful - valid JSON preserved');
        return enhanced;
      } catch (e) {
        console.log('❌ Intelligent merge failed, returning original structure');
        return typeof original === 'string' ? original : JSON.stringify(original, null, 2);
      }
      
    } catch (error) {
      console.error('Error in intelligent JSON merge:', error);
      return typeof formatInfo.originalData === 'string' 
        ? formatInfo.originalData 
        : JSON.stringify(formatInfo.originalData, null, 2);
    }
  }

  // Enhance JSON structure using simple rules while preserving format
  enhanceJsonWithSimpleRules(original, aiResponse) {
    try {
      // Extract meaningful text from AI response
      const enhancedText = this.extractMeaningfulText(aiResponse);
      
      if (Array.isArray(original)) {
        // For slides array
        const enhanced = original.map((slide, index) => {
          const newSlide = { ...slide };
          
          // Apply simple enhancements to text fields
          if (slide.title && typeof slide.title === 'string') {
            newSlide.title = this.applySimpleEnhancement(slide.title, enhancedText);
          }
          
          if (slide.content && typeof slide.content === 'string') {
            newSlide.content = this.applySimpleEnhancement(slide.content, enhancedText); 
          }
          
          return newSlide;
        });
        
        return JSON.stringify(enhanced, null, 2);
        
      } else if (typeof original === 'object' && original !== null) {
        // For quiz/object structure
        const enhanced = { ...original };
        
        // Enhance title
        if (original.title && typeof original.title === 'string') {
          enhanced.title = this.applySimpleEnhancement(original.title, enhancedText);
        }
        
        // Enhance questions
        if (original.questions && Array.isArray(original.questions)) {
          enhanced.questions = original.questions.map(question => {
            const newQuestion = { ...question };
            
            if (question.question && typeof question.question === 'string') {
              newQuestion.question = this.applySimpleEnhancement(question.question, enhancedText);
            }
            
            return newQuestion;
          });
        }
        
        return JSON.stringify(enhanced, null, 2);
      }
      
      // Fallback
      return JSON.stringify(original, null, 2);
      
    } catch (error) {
      console.error('Error enhancing JSON with simple rules:', error);
      return JSON.stringify(original, null, 2);
    }
  }

  // Extract meaningful text from AI response, ignoring formatting
  extractMeaningfulText(aiResponse) {
    return aiResponse
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[{}[\]"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Apply simple enhancement to text based on AI response context
  applySimpleEnhancement(originalText, enhancedContext) {
    try {
      // If the enhanced context contains professional language, make text more professional
      if (enhancedContext.toLowerCase().includes('professional') || 
          enhancedContext.includes('comprehensive') || 
          enhancedContext.includes('detailed')) {
        
        return originalText
          .replace(/\b(really|very|pretty|quite)\s+/gi, '')
          .replace(/\b(awesome|cool|great|nice)\b/gi, 'excellent')
          .replace(/\b(stuff|things)\b/gi, 'concepts')
          .replace(/\b(gonna|wanna)\b/gi, (match) => match === 'gonna' ? 'going to' : 'want to');
      }
      
      // Basic grammar improvements
      return originalText
        .replace(/\bi\b/g, 'I')
        .replace(/\s+/g, ' ')
        .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
        .trim();
        
    } catch (error) {
      console.error('Error applying simple enhancement:', error);
      return originalText;
    }
  }

  // Extract enhanced texts from AI response
  extractEnhancedTexts(aiResponse, original) {
    const enhancedTexts = {};
    
    try {
      // Remove code blocks and clean response
      let cleanText = aiResponse
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim();
      
      // Try to find enhanced content patterns
      if (Array.isArray(original)) {
        // For slides, try to extract titles and contents
        const titleMatches = cleanText.match(/"title":\s*"([^"]+)"/g);
        const contentMatches = cleanText.match(/"content":\s*"([^"]+)"/g);
        
        if (titleMatches) {
          enhancedTexts.titles = titleMatches.map(match => 
            match.replace(/"title":\s*"([^"]+)"/, '$1')
          );
        }
        
        if (contentMatches) {
          enhancedTexts.contents = contentMatches.map(match => 
            match.replace(/"content":\s*"([^"]+)"/, '$1')
          );
        }
      } else if (original.questions) {
        // For quiz, try to extract questions
        const questionMatches = cleanText.match(/"question":\s*"([^"]+)"/g);
        
        if (questionMatches) {
          enhancedTexts.questions = questionMatches.map(match => 
            match.replace(/"question":\s*"([^"]+)"/, '$1')
          );
        }
      }
      
      // Store general enhanced text as fallback
      enhancedTexts.general = cleanText;
      
    } catch (error) {
      console.error('Error extracting enhanced texts:', error);
      enhancedTexts.general = aiResponse;
    }
    
    return enhancedTexts;
  }

  // Improve text using enhanced content as reference
  improveText(original, enhanced) {
    try {
      // If enhanced text contains similar keywords to original, it might be relevant
      const originalWords = original.toLowerCase().split(/\s+/);
      const enhancedWords = enhanced.toLowerCase().split(/\s+/);
      
      const commonWords = originalWords.filter(word => 
        enhancedWords.includes(word) && word.length > 3
      );
      
      // If there's significant overlap, the enhanced text is probably relevant
      if (commonWords.length >= Math.min(3, originalWords.length * 0.3)) {
        // Extract sentences from enhanced text that seem relevant
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const relevantSentence = sentences.find(sentence => 
          commonWords.some(word => sentence.toLowerCase().includes(word))
        );
        
        if (relevantSentence) {
          return relevantSentence.trim();
        }
      }
      
      // Fallback: return original
      return original;
      
    } catch (error) {
      console.error('Error improving text:', error);
      return original;
    }
  }

  // Simple text enhancement for fallback scenarios
  enhanceTextSimply(originalText, enhancedText) {
    // If enhanced text is much longer and contains original, use enhanced
    if (enhancedText.length > originalText.length * 1.2 && 
        enhancedText.toLowerCase().includes(originalText.toLowerCase().substring(0, 20))) {
      return enhancedText;
    }
    return originalText;
  }

  // Enhance JSON content while preserving structure (fallback mode)
  enhanceJsonContentFallback(originalData, prompt) {
    try {
      const promptLower = prompt.toLowerCase();
      const enhanced = JSON.parse(JSON.stringify(originalData)); // Deep clone
      
      // Apply basic text enhancements to text fields in JSON
      this.enhanceJsonFields(enhanced, promptLower);
      
      return JSON.stringify(enhanced, null, 2);
    } catch (error) {
      console.error('Error enhancing JSON in fallback mode:', error);
      return JSON.stringify(originalData, null, 2);
    }
  }

  // Recursively enhance text fields in JSON structure
  enhanceJsonFields(obj, promptLower) {
    if (Array.isArray(obj)) {
      obj.forEach(item => this.enhanceJsonFields(item, promptLower));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string' && obj[key].length > 10) {
          // Apply basic enhancement to string values
          if (promptLower.includes('grammar') || promptLower.includes('fix')) {
            obj[key] = obj[key]
              .replace(/\bi\b/g, 'I')
              .replace(/\s+/g, ' ')
              .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
              .trim();
          } else if (promptLower.includes('professional')) {
            obj[key] = obj[key]
              .replace(/\b(really|very|pretty|quite)\s+/gi, '')
              .replace(/\b(awesome|cool|great|nice)\b/gi, 'excellent');
          }
          // Add more enhancement rules as needed
        } else if (typeof obj[key] === 'object') {
          this.enhanceJsonFields(obj[key], promptLower);
        }
      });
    }
  }

  // Enhance HTML content while preserving tags (fallback mode)
  enhanceHtmlContentFallback(htmlContent, prompt) {
    try {
      const promptLower = prompt.toLowerCase();
      let enhanced = htmlContent;
      
      if (promptLower.includes('grammar') || promptLower.includes('fix')) {
        // Apply grammar fixes to text content within HTML tags
        enhanced = enhanced.replace(/>([^<]+)</g, (match, textContent) => {
          const fixed = textContent
            .replace(/\bi\b/g, 'I')
            .replace(/\s+/g, ' ')
            .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
            .trim();
          return `>${fixed}<`;
        });
      } else if (promptLower.includes('professional')) {
        enhanced = enhanced.replace(/>([^<]+)</g, (match, textContent) => {
          const professional = textContent
            .replace(/\b(really|very|pretty|quite)\s+/gi, '')
            .replace(/\b(awesome|cool|great|nice)\b/gi, 'excellent');
          return `>${professional}<`;
        });
      }
      
      return enhanced;
    } catch (error) {
      console.error('Error enhancing HTML in fallback mode:', error);
      return htmlContent;
    }
  }

  fallbackEnhancement(content, prompt, formatInfo) {
    console.log('Using fallback AI enhancement with format preservation');
    
    let enhancedContent = content;
    const promptLower = prompt.toLowerCase();
    
    try {
      // Handle different formats in fallback mode
      if (formatInfo.isJson) {
        // For JSON content, apply enhancements while preserving structure
        enhancedContent = this.enhanceJsonContentFallback(formatInfo.originalData, prompt);
      } else if (formatInfo.type === 'html') {
        // For HTML content, enhance text within tags
        enhancedContent = this.enhanceHtmlContentFallback(content, prompt);
      } else {
        // Plain text enhancement
        if (promptLower.includes('concise') || promptLower.includes('shorter') || promptLower.includes('summarize')) {
          const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const keyPoints = sentences.slice(0, Math.ceil(sentences.length * 0.7));
          enhancedContent = keyPoints.map(sentence => sentence.trim()).join('. ') + '.';
          
        } else if (promptLower.includes('bullet') || promptLower.includes('list') || promptLower.includes('points')) {
          const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
          enhancedContent = sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
          
        } else if (promptLower.includes('grammar') || promptLower.includes('fix') || promptLower.includes('correct')) {
          enhancedContent = content
            .replace(/\bi\b/g, 'I')
            .replace(/\s+/g, ' ')
            .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
            .replace(/\b(cant|wont|dont|isnt|arent|wasnt|werent)\b/g, (match) => {
              const fixes = {
                'cant': "can't", 'wont': "won't", 'dont': "don't",
                'isnt': "isn't", 'arent': "aren't", 'wasnt': "wasn't", 'werent': "weren't"
              };
              return fixes[match] || match;
            })
            .trim();
            
        } else if (promptLower.includes('expand') || promptLower.includes('detail') || promptLower.includes('elaborate')) {
          const paragraphs = content.split('\n\n').filter(p => p.trim());
          enhancedContent = paragraphs.map(para => {
            if (para.trim().length < 100) {
              return para + ' This concept can be further explored with additional examples and real-world applications.';
            }
            return para;
          }).join('\n\n');
          
        } else if (promptLower.includes('professional') || promptLower.includes('formal')) {
          enhancedContent = content
            .replace(/\b(really|very|pretty|quite)\s+/gi, '')
            .replace(/\b(awesome|cool|great|nice)\b/gi, 'excellent')
            .replace(/\b(stuff|things)\b/gi, 'items')
            .replace(/\b(gonna|wanna)\b/gi, (match) => match === 'gonna' ? 'going to' : 'want to');
            
        } else if (promptLower.includes('simple') || promptLower.includes('easy') || promptLower.includes('basic')) {
          enhancedContent = content
            .replace(/\b(utilize|implement|facilitate)\b/gi, 'use')
            .replace(/\b(subsequently|therefore|consequently)\b/gi, 'so')
            .replace(/\b(commence|initiate)\b/gi, 'start');
            
        } else {
          enhancedContent = content + `\n\n[Content enhanced based on: "${prompt}"]`;
        }
      }

      return {
        success: true,
        enhancedContent,
        originalContent: content,
        appliedPrompt: prompt,
        method: 'fallback',
        preservedFormat: formatInfo.type,
        note: 'Enhanced using basic rules with format preservation (GROQ_API_KEY not available)'
      };

    } catch (error) {
      console.error('Fallback enhancement error:', error);
      throw new Error(`Enhancement failed: ${error.message}`);
    }
  }

  // Detect the original content format to preserve structure
  detectContentFormat(content, contentType) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      
      // Check for common slide/quiz structures
      if (Array.isArray(parsed)) {
        // Likely slides array
        if (parsed.some(item => item.title || item.content || item.type)) {
          return {
            type: 'slides_json',
            isJson: true,
            structure: 'array',
            originalData: parsed
          };
        }
      } else if (typeof parsed === 'object') {
        // Check for quiz structure
        if (parsed.questions || parsed.title || parsed.slides) {
          return {
            type: contentType === 'quiz' ? 'quiz_json' : 'slides_json',
            isJson: true,
            structure: 'object',
            originalData: parsed
          };
        }
      }
      
      return {
        type: 'json',
        isJson: true,
        structure: Array.isArray(parsed) ? 'array' : 'object',
        originalData: parsed
      };
      
    } catch (e) {
      // Not JSON, check for HTML
      if (content.includes('<') && content.includes('>')) {
        // Check for specific HTML patterns
        const hasHtmlTags = /<[^>]+>/g.test(content);
        if (hasHtmlTags) {
          return {
            type: 'html',
            isJson: false,
            structure: 'html',
            originalData: content
          };
        }
      }
      
      // Default to plain text
      return {
        type: 'text',
        isJson: false,
        structure: 'text',
        originalData: content
      };
    }
  }

  // Utility method to check if AI is available
  isAIAvailable() {
    return !!this.groq;
  }

  // Get AI service status
  getStatus() {
    return {
      available: this.isAIAvailable(),
      model: this.isAIAvailable() ? 'meta-llama/llama-4-scout-17b-16e-instruct' : null,
      provider: this.isAIAvailable() ? 'Groq' : 'fallback',
      apiKeyConfigured: !!process.env.GROQ_API_KEY
    };
  }
}

module.exports = AIAssistService;