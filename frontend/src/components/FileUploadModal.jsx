import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Target, FileText } from 'lucide-react';
import LoaderSpinner from './LoaderSpinner';

const FileUploadModal = ({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  selectedFile, 
  isLoading, 
  isExtractingContent,
  onGenerate,
  dragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop
}) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Modal content */}
          <motion.div
            className="relative z-10 bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#fafafa1a]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#fafafa1a] bg-gray-50 dark:bg-[#121212]">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-[#1E1E1E] rounded-xl flex items-center justify-center border border-gray-200 dark:border-[#fafafa1a]">
                  <Upload className="w-6 h-6 text-[#171717] dark:text-[#fafafa]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">Upload File</h2>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Upload documents to generate learning content</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E1E1E]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div
                className={`relative border-2 ${
                  dragActive ? "border-[#171717] dark:border-[#fafafa] bg-gray-50 dark:bg-[#1E1E1E]" : "border-dashed border-gray-300 dark:border-[#fafafa1a]"
                } rounded-xl p-8 text-center transition-all ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400 dark:hover:border-[#fafafa2a] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]"
                }`}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onFileSelect(file);
                    }
                  }}
                  accept=".pdf,.docx,.txt,.pptx"
                  disabled={isLoading}
                />
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-[#1E1E1E] rounded-2xl flex items-center justify-center border border-gray-200 dark:border-[#fafafa1a]">
                      <Upload size={40} className="text-[#171717] dark:text-[#fafafa]" />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#171717] dark:text-[#fafafa] hover:opacity-80 font-semibold text-base"
                      disabled={isLoading}
                    >
                      Click to upload
                    </button>
                    <span className="text-[#171717cc] dark:text-[#fafafacc] text-base">
                      {" "}or drag and drop
                    </span>
                  </div>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    PDF, DOCX, TXT, PPTX (max 10MB)
                  </p>
                </div>
              </div>

              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        Selected: {selectedFile.name}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                      <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  
                  {/* Generate Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={onGenerate}
                      disabled={isLoading || isExtractingContent}
                      className="px-6 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                    >
                      {isLoading || isExtractingContent ? (
                        <>
                          <LoaderSpinner size="sm" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Target size={20} />
                          <span>Generate Content</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-[#fafafa1a] bg-gray-50 dark:bg-[#121212]">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] font-semibold transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E1E1E]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FileUploadModal;

