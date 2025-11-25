let pipeline;

(async () => {
  const transformers = await import('@xenova/transformers');
  pipeline = transformers.pipeline;
})();

const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Singleton pipeline instance
let whisperPipeline = null;
let isLoading = false;
let loadPromise = null;

/**
 * Initialize Whisper pipeline (lazy loading)
 * Uses Whisper base model for good balance of speed and accuracy
 */
async function getWhisperPipeline() {
  if (whisperPipeline) {
    return whisperPipeline;
  }
  
  if (isLoading) {
    return loadPromise;
  }
  
  isLoading = true;
  console.log('[TranscriptionService] Loading Whisper model (base)... This may take a moment on first run.');
  
  loadPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
    quantized: true, // Use quantized model for faster inference
  }).then(pipe => {
    whisperPipeline = pipe;
    isLoading = false;
    console.log('[TranscriptionService] Whisper model loaded successfully!');
    return whisperPipeline;
  }).catch(err => {
    isLoading = false;
    console.error('[TranscriptionService] Failed to load Whisper model:', err);
    throw err;
  });
  
  return loadPromise;
}

/**
 * Convert audio file to raw PCM float32 data at 16kHz mono
 * Required format for Whisper in Node.js
 */
function convertToRawAudio(inputPath) {
  return new Promise((resolve, reject) => {
    console.log(`[TranscriptionService] Converting ${path.basename(inputPath)} to raw audio...`);
    
    const chunks = [];
    
    ffmpeg(inputPath)
      .toFormat('f32le')  // 32-bit float little-endian (raw PCM)
      .audioFrequency(16000)
      .audioChannels(1)
      .on('start', (cmd) => {
        console.log('[TranscriptionService] FFmpeg command:', cmd);
      })
      .on('error', (err) => {
        console.error('[TranscriptionService] FFmpeg error:', err);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .pipe()
      .on('data', (chunk) => {
        chunks.push(chunk);
      })
      .on('end', () => {
        console.log('[TranscriptionService] Audio conversion completed');
        const buffer = Buffer.concat(chunks);
        // Convert Buffer to Float32Array
        const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
        console.log(`[TranscriptionService] Audio samples: ${float32Array.length} (${(float32Array.length / 16000).toFixed(2)}s)`);
        resolve(float32Array);
      })
      .on('error', (err) => {
        reject(new Error(`Stream error: ${err.message}`));
      });
  });
}

/**
 * Transcribe audio file using Whisper
 * @param {string} audioFilePath - Path to the audio file
 * @param {Object} options - Transcription options
 * @returns {Object} - Transcription result with text and metadata
 */
async function transcribeAudio(audioFilePath, options = {}) {
  const startTime = Date.now();
  
  try {
    // Validate file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error('Audio file not found');
    }
    
    const fileStats = fs.statSync(audioFilePath);
    if (fileStats.size === 0) {
      throw new Error('Audio file is empty');
    }
    
    console.log(`[TranscriptionService] Processing audio file: ${path.basename(audioFilePath)}`);
    console.log(`[TranscriptionService] File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Convert audio to raw Float32Array (required for Node.js)
    const audioData = await convertToRawAudio(audioFilePath);
    
    // Load Whisper pipeline
    const transcriber = await getWhisperPipeline();
    
    console.log('[TranscriptionService] Starting transcription...');
    
    // Transcribe with raw audio data
    const result = await transcriber(audioData, {
      language: options.language || 'english',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[TranscriptionService] Transcription completed in ${processingTime}s`);
    console.log(`[TranscriptionService] Transcript length: ${result.text?.length || 0} characters`);
    
    return {
      success: true,
      transcript: result.text?.trim() || '',
      chunks: result.chunks || [],
      language: options.language || 'english',
      processingTime: parseFloat(processingTime),
      model: 'whisper-base'
    };
    
  } catch (error) {
    console.error('[TranscriptionService] Transcription error:', error);
    throw error;
  }
}

/**
 * Pre-load the Whisper model (call on server startup for faster first transcription)
 */
async function preloadModel() {
  try {
    console.log('[TranscriptionService] Pre-loading Whisper model...');
    await getWhisperPipeline();
    return true;
  } catch (error) {
    console.error('[TranscriptionService] Failed to pre-load model:', error.message);
    return false;
  }
}

module.exports = {
  transcribeAudio,
  preloadModel,
  convertToRawAudio
};
