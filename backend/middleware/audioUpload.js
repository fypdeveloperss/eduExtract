const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/audio directory exists
const audioUploadDir = path.join(__dirname, '../uploads/audio');
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioUploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const audioUpload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (Whisper API limit)
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'audio/webm',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/flac',
      'video/webm' // WebM can sometimes be detected as video
    ];
    
    // Also check by extension for browser compatibility
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac', '.mp4'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      console.log('Rejected audio file:', file.mimetype, file.originalname);
      cb(new Error(`Invalid audio format: ${file.mimetype}. Supported formats: WebM, WAV, MP3, M4A, OGG, FLAC`), false);
    }
  }
});

module.exports = audioUpload;
