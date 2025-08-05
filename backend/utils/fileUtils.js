const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Extract text from uploaded files
async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf8');
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      throw new Error('PPTX text extraction not implemented yet');
    }
    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Text extraction error:', error);
    throw error;
  }
}

// Clean up uploaded files
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Cleaned up file:', filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

module.exports = {
  extractTextFromFile,
  cleanupFile
}; 