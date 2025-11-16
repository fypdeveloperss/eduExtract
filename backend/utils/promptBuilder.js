/**
 * Prompt Builder Utility
 * Builds personalized AI prompts based on user preferences
 */

/**
 * Get dynamic token count based on content type and user preferences
 */
function getTokenCount(contentType, userPreferences) {
  const tokenConfig = {
    blog: {
      brief: 2000,     // ~1200 words * 1.5 = 1800 tokens + buffer
      medium: 3500,    // ~2000 words * 1.5 = 3000 tokens + buffer
      detailed: 6500   // ~3500 words * 1.5 = 5250 tokens + buffer for HTML tags and comprehensive content
    },
    summary: {
      brief: 8192,     // Maximum allowed by Groq API - AI will generate based on Brief instructions (200-300 words) and stop naturally
      medium: 8192,    // Maximum allowed by Groq API - AI will generate based on Medium instructions (400-600 words) and stop naturally
      detailed: 8192   // Maximum allowed by Groq API - AI will generate based on Detailed instructions (800-1200 words) and stop naturally
    },
    flashcards: {
      simple: 800,
      detailed: 1500,
      visual: 1200
    },
    slides: {
      5: 800,
      10: 1500,
      15: 2000,
      20: 2500,
      default: 1500
    },
    quiz: {
      5: 2000,
      10: 3000,
      15: 4000,
      20: 5000,
      default: 3000
    }
  };

  const prefs = userPreferences?.contentPreferences || {};
  
  switch(contentType) {
    case 'blog':
      const blogLength = prefs.blogLength || 'medium';
      return tokenConfig.blog[blogLength];
      
    case 'summary':
      const summaryLength = prefs.summaryLength || 'medium';
      return tokenConfig.summary[summaryLength];
      
    case 'flashcards':
      const flashcardStyle = prefs.flashcardStyle || 'simple';
      return tokenConfig.flashcards[flashcardStyle];
      
    case 'slides':
      const slideCount = prefs.presentationSlides || 10;
      return tokenConfig.slides[slideCount] || tokenConfig.slides.default;
      
    case 'quiz':
      const questionCount = prefs.quizQuestions || 10;
      return tokenConfig.quiz[questionCount] || tokenConfig.quiz.default;
      
    default:
      return 1024;
  }
}

/**
 * Build tone instructions based on user preferences
 */
function buildToneInstructions(tonePreferences) {
  if (!tonePreferences) return '';
  
  const { communicationStyle, complexityLevel, languageStyle } = tonePreferences;
  
  let instructions = '\n--- PERSONALIZED TONE & STYLE ---\n';
  
  // Communication Style
  if (communicationStyle === 'professional') {
    instructions += `
- TONE: Professional & Business-oriented
  * Use industry-standard terminology and best practices
  * Include professional examples and case studies
  * Reference authoritative sources and standards
  * Maintain executive-level discourse
  * Focus on practical applications and ROI`;
  } else if (communicationStyle === 'casual') {
    instructions += `
- TONE: Casual & Conversational
  * Use everyday language and relatable examples
  * Include personal anecdotes and stories
  * Use contractions and friendly expressions
  * Make content engaging and easy to digest
  * Use "you" and "we" to create connection`;
  } else if (communicationStyle === 'friendly') {
    instructions += `
- TONE: Friendly & Encouraging
  * Use warm, supportive language
  * Include motivational elements
  * Provide positive reinforcement
  * Make learning feel approachable and fun
  * Use encouraging phrases and emojis when appropriate`;
  } else { // academic (default)
    instructions += `
- TONE: Academic & Scholarly
  * Use formal academic language
  * Reference research and scholarly sources
  * Maintain objective, analytical perspective
  * Follow academic writing conventions
  * Include theoretical frameworks`;
  }
  
  // Complexity Level
  instructions += '\n';
  if (complexityLevel === 'beginner') {
    instructions += `
- COMPLEXITY: Beginner-friendly
  * Explain concepts from first principles
  * Define technical terms when introduced
  * Use simple analogies and metaphors
  * Break down complex ideas into steps
  * Avoid assuming prior knowledge`;
  } else if (complexityLevel === 'advanced') {
    instructions += `
- COMPLEXITY: Advanced level
  * Assume strong foundational knowledge
  * Use technical terminology without excessive definitions
  * Provide in-depth analysis and nuanced insights
  * Include advanced concepts and edge cases
  * Challenge the reader with sophisticated ideas`;
  } else { // intermediate (default)
    instructions += `
- COMPLEXITY: Intermediate level
  * Assume basic familiarity with concepts
  * Explain technical terms briefly
  * Balance theory with practical examples
  * Include moderate depth of analysis
  * Build on foundational knowledge`;
  }
  
  // Language Style
  instructions += '\n';
  if (languageStyle === 'informal') {
    instructions += `
- LANGUAGE: Informal & Relaxed
  * Use conversational sentence structure
  * Include colloquial expressions
  * Write as if speaking to a friend
  * Use shorter, punchier sentences`;
  } else if (languageStyle === 'conversational') {
    instructions += `
- LANGUAGE: Conversational & Natural
  * Use natural speech patterns
  * Include rhetorical questions
  * Write in active voice
  * Create dialogue with the reader`;
  } else { // formal (default)
    instructions += `
- LANGUAGE: Formal & Structured
  * Use proper grammar and punctuation
  * Maintain professional sentence structure
  * Write in complete, well-structured sentences
  * Avoid contractions and slang`;
  }
  
  return instructions;
}

/**
 * Build content customization instructions
 */
function buildCustomizationInstructions(contentCustomization, studyProfile) {
  if (!contentCustomization) return '';
  
  let instructions = '\n--- CONTENT CUSTOMIZATION ---\n';
  
  if (contentCustomization.includeExamples) {
    instructions += '- Include practical, real-world examples throughout\n';
  }
  
  if (contentCustomization.includeVisuals) {
    instructions += '- Describe visual elements, diagrams, or charts where helpful\n';
    instructions += '- Use ASCII art or structured formatting for visual concepts\n';
  }
  
  if (contentCustomization.includeReferences) {
    instructions += '- Include citations and references for key claims\n';
    instructions += '- Mention authoritative sources and research\n';
  }
  
  if (contentCustomization.personalizedExamples && studyProfile?.courses?.length > 0) {
    instructions += `- Relate examples to these subjects: ${studyProfile.courses.join(', ')}\n`;
    instructions += '- Use domain-specific examples relevant to the user\'s field of study\n';
  }
  
  return instructions;
}

/**
 * Build personalized prompt for BLOG generation
 */
function buildBlogPrompt(userPreferences) {
  const prefs = userPreferences || {};
  const tonePrefs = prefs.tonePreferences || {};
  const contentPrefs = prefs.contentPreferences || {};
  const customization = prefs.contentCustomization || {};
  const studyProfile = prefs.studyProfile || {};
  
  const blogLength = contentPrefs.blogLength || 'medium';
  const wordCounts = {
    brief: '800-1200',
    medium: '1500-2000',
    detailed: '2500-3500'
  };
  
  const lengthInstructions = {
    brief: {
      minWords: 800,
      maxWords: 1200,
      instruction: `
LENGTH REQUIREMENT: 800-1200 words (MANDATORY - STRICTLY ENFORCED)
- Write 4-6 main sections with 2-3 paragraphs each
- Each paragraph should be 100-150 words
- Focus on core concepts only
- Keep examples concise
- MINIMUM: 800 words, TARGET: 1000 words, MAXIMUM: 1200 words`
    },
    medium: {
      minWords: 1500,
      maxWords: 2000,
      instruction: `
LENGTH REQUIREMENT: 1500-2000 words (MANDATORY - STRICTLY ENFORCED)
- Write 6-8 main sections with 3-4 paragraphs each
- Each paragraph should be 150-200 words
- Include detailed explanations and examples
- Provide good depth without being exhaustive
- MINIMUM: 1500 words, TARGET: 1750 words, MAXIMUM: 2000 words`
    },
    detailed: {
      minWords: 2500,
      maxWords: 3500,
      instruction: `
LENGTH REQUIREMENT: 2500-3500 words (MANDATORY - STRICTLY ENFORCED)
- Write 8-12 main sections with 4-5 paragraphs each
- Each paragraph should be 200-250 words
- Include comprehensive analysis and multiple examples
- Provide in-depth coverage of all aspects
- Add case studies, statistics, and detailed explanations
- Expand on every point with thorough detail
- MINIMUM: 2500 words, TARGET: 3000 words, MAXIMUM: 3500 words`
    }
  };
  
  const selectedLength = lengthInstructions[blogLength] || lengthInstructions.medium;
  const targetWordCount = Math.round((selectedLength.minWords + selectedLength.maxWords) / 2);
  
  let prompt = `Generate a professional, well-structured HTML blog post based on the transcript.

${selectedLength.instruction}

⚠️ CRITICAL WORD COUNT REQUIREMENT ⚠️
You MUST generate a blog post with AT LEAST ${selectedLength.minWords} words and aim for ${targetWordCount} words.
The blog post MUST be between ${selectedLength.minWords}-${selectedLength.maxWords} words.
DO NOT stop writing until you have reached the minimum word count.
If you are below ${selectedLength.minWords} words, you MUST continue writing and add more content, examples, and details.

STRUCTURE REQUIREMENTS:
- Use <h1> for the main title
- Use <h2> for major sections
- Use <h3> for sub-sections
- Use <p> for paragraphs
- Use <ul><li> or <ol><li> for lists
- Use <b> or <strong> for emphasis
- Use <i> or <em> for important terms
- Include an engaging introduction (200+ words)
- Include multiple detailed body sections
- Include a thoughtful conclusion (200+ words)
- Return ONLY valid HTML without CSS or markdown
- Do NOT include JSON formatting or code blocks`;

  prompt += buildToneInstructions(tonePrefs);
  prompt += buildCustomizationInstructions(customization, studyProfile);
  
  prompt += `\n\n⚠️ FINAL REMINDER: WORD COUNT REQUIREMENT ⚠️
The blog post MUST be ${selectedLength.minWords}-${selectedLength.maxWords} words.
Target word count: ${targetWordCount} words.
Count your words and ensure you meet the minimum requirement.
If the content is too short, add more sections, examples, case studies, or detailed explanations.
DO NOT submit a blog post that is shorter than ${selectedLength.minWords} words.`;
  
  return prompt;
}

/**
 * Build personalized prompt for FLASHCARD generation
 */
function buildFlashcardPrompt(userPreferences) {
  const prefs = userPreferences || {};
  const tonePrefs = prefs.tonePreferences || {};
  const contentPrefs = prefs.contentPreferences || {};
  const flashcardStyle = contentPrefs.flashcardStyle || 'simple';
  
  let prompt = '';
  
  if (flashcardStyle === 'simple') {
    prompt = `Generate exactly 5-8 educational flashcards as a JSON array.
Each flashcard must have exactly these fields:
{
  "question": "Clear, specific question (1 sentence)",
  "answer": "Concise, accurate answer (1-2 sentences)"
}

STYLE: Simple & Direct
- Keep questions and answers brief
- Focus on key facts and concepts
- Use clear, unambiguous language`;
  } else if (flashcardStyle === 'detailed') {
    prompt = `Generate exactly 5-8 educational flashcards as a JSON array.
Each flashcard must have exactly these fields:
{
  "question": "Clear, thought-provoking question",
  "answer": "Comprehensive answer with explanation and context (3-5 sentences)"
}

STYLE: Detailed & Explanatory
- Provide thorough explanations in answers
- Include context and examples
- Explain the "why" behind concepts
- Add relevant details that aid understanding`;
  } else { // visual
    prompt = `Generate exactly 5-8 educational flashcards as a JSON array.
Each flashcard must have exactly these fields:
{
  "question": "Clear, specific question with visual description",
  "answer": "Answer with visual metaphors and descriptive language"
}

STYLE: Visual & Descriptive
- Use visual metaphors and analogies
- Describe concepts in visual terms
- Include relevant emojis where appropriate (📊 📈 🎯 💡 etc.)
- Paint mental pictures to aid memory`;
  }
  
  prompt += buildToneInstructions(tonePrefs);
  
  prompt += `

IMPORTANT OUTPUT FORMAT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Start response with [ and end with ]
- Example: [{"question":"What is...?","answer":"It is..."},{"question":"How does...?","answer":"It works by..."}]`;
  
  return prompt;
}

/**
 * Build personalized prompt for SLIDES generation
 */
function buildSlidesPrompt(userPreferences) {
  const prefs = userPreferences || {};
  const tonePrefs = prefs.tonePreferences || {};
  const contentPrefs = prefs.contentPreferences || {};
  const customization = prefs.contentCustomization || {};
  const slideCount = contentPrefs.presentationSlides || 10;
  
  let prompt = `Generate exactly ${slideCount} professional presentation slides as a JSON array.
Each slide must have exactly these fields:
{
  "title": "Clear, engaging slide title",
  "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3", "Bullet point 4", "Bullet point 5", "Bullet point 6"]
}

PRESENTATION REQUIREMENTS:
- Create exactly ${slideCount} slides
- First slide: Title slide with overview
- Middle slides: Main content (one concept per slide)
- Last slide: Summary/Conclusion
- Each slide should have 5-8 bullet points in the content array
- Keep each bullet point concise (max 12-18 words)
- Make content scannable and presentation-ready
- Provide comprehensive coverage with multiple points per slide`;

  prompt += buildToneInstructions(tonePrefs);
  prompt += buildCustomizationInstructions(customization, prefs.studyProfile);
  
  prompt += `

OUTPUT FORMAT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Start with [ and end with ]
- content field MUST be an array of strings
- Each slide should be presentation-ready
- Example: [{"title":"Introduction","content":["Point 1","Point 2","Point 3"]},{"title":"Main Topic","content":["Detail A","Detail B","Detail C"]}]`;
  
  return prompt;
}

/**
 * Build personalized prompt for QUIZ generation
 */
function buildQuizPrompt(userPreferences) {
  const prefs = userPreferences || {};
  const tonePrefs = prefs.tonePreferences || {};
  const contentPrefs = prefs.contentPreferences || {};
  const quizFormat = contentPrefs.quizFormat || 'multiple-choice';
  const questionCount = contentPrefs.quizQuestions || 10;
  const complexityLevel = tonePrefs.complexityLevel || 'intermediate';
  
  let prompt = '';
  
  if (quizFormat === 'true-false') {
    prompt = `Generate exactly ${questionCount} true/false quiz questions as a JSON array.
Each question must have exactly these fields:
{
  "question": "Clear statement to evaluate",
  "options": ["True", "False"],
  "correctAnswer": "True" or "False",
  "explanation": "Brief explanation of the answer"
}

IMPORTANT FOR TRUE/FALSE:
- correctAnswer MUST be exactly "True" or "False" (capital T and F)
- options array MUST be exactly ["True", "False"]
- Ensure correctAnswer matches one of the options exactly`;
  } else {
    // Default to multiple-choice
    prompt = `Generate exactly ${questionCount} educational quiz questions as a JSON array.
Each question must have exactly these fields:
{
  "question": "Clear, specific question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text (must match one of the options exactly)",
  "explanation": "Brief explanation of why this is correct"
}`;
  }
  
  // Add difficulty-based instructions
  if (complexityLevel === 'beginner') {
    prompt += `

DIFFICULTY: Beginner
- Focus on recall and basic understanding
- Test fundamental concepts
- Use straightforward, clear questions
- Avoid tricky or ambiguous phrasing`;
  } else if (complexityLevel === 'advanced') {
    prompt += `

DIFFICULTY: Advanced
- Test application and analysis skills
- Include scenario-based questions
- Require critical thinking
- Test edge cases and nuanced understanding`;
  } else {
    prompt += `

DIFFICULTY: Intermediate
- Mix recall with application questions
- Test conceptual understanding
- Include some analytical questions
- Balance straightforward and challenging`;
  }
  
  prompt += buildToneInstructions(tonePrefs);
  
  prompt += `

OUTPUT FORMAT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Ensure correctAnswer exactly matches one option
- Start with [ and end with ]`;
  
  return prompt;
}

/**
 * Build personalized prompt for SUMMARY generation
 */
function buildSummaryPrompt(userPreferences) {
  const prefs = userPreferences || {};
  const tonePrefs = prefs.tonePreferences || {};
  const contentPrefs = prefs.contentPreferences || {};
  const customization = prefs.contentCustomization || {};
  const summaryLength = contentPrefs.summaryLength || 'medium';
  
  const wordCounts = {
    brief: '200-300',
    medium: '400-600',
    detailed: '800-1200'
  };
  
  const structures = {
    brief: `
STRUCTURE: Brief Summary
- 2-3 paragraphs maximum
- Focus on key points only
- Use simple paragraphs
- Skip minor details`,
    medium: `
STRUCTURE: Medium Summary
- 3-5 paragraphs
- Cover main concepts and important details
- Use clear paragraph breaks
- Include key examples`,
    detailed: `
STRUCTURE: Detailed Summary
- 5-8 paragraphs
- Comprehensive coverage of all major points
- Include examples and context
- Explain relationships between concepts
- Add relevant details and nuances`
  };
  
  let prompt = `Generate a clear, well-organized HTML summary of the content.

TARGET LENGTH: ${wordCounts[summaryLength]} words
${structures[summaryLength]}

FORMAT REQUIREMENTS:
- Use <h2> for section headings (NOT inside <p> tags)
- Use <p> for paragraphs
- Use <ul><li> for bullet points
- Use <strong> or <b> for emphasis
- Return ONLY valid HTML without CSS or markdown
- Do NOT use markdown formatting (**, *, #, etc.)
- Do NOT wrap headings in paragraph tags
- Do NOT include code blocks or markdown syntax
- Start with content immediately (no "Here is..." or "Summary:")
- Proper HTML structure: <h2>Heading</h2><p>Paragraph text.</p><ul><li>Item</li></ul>
- End with a complete, well-formed conclusion paragraph that summarizes the key points`;

  prompt += buildToneInstructions(tonePrefs);
  prompt += buildCustomizationInstructions(customization, prefs.studyProfile);
  
  return prompt;
}

module.exports = {
  getTokenCount,
  buildBlogPrompt,
  buildFlashcardPrompt,
  buildSlidesPrompt,
  buildQuizPrompt,
  buildSummaryPrompt,
  buildToneInstructions,
  buildCustomizationInstructions
};
