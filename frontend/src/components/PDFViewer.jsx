import React, { useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const PDFViewer = ({ file, onError }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create default layout plugin
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  React.useEffect(() => {
    if (file) {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      } catch (err) {
        console.error('Error creating PDF URL:', err);
        setError('Failed to create PDF URL');
        if (onError) {
          onError('Failed to create PDF URL');
        }
      }
      
      // Cleanup function to revoke the URL when component unmounts
      return () => {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
      };
    }
  }, [file]);

  const handleDocumentLoad = () => {
    setIsLoading(false);
    setError(null);
    console.log('PDF loaded successfully');
  };

  const handleLoadError = (error) => {
    console.error('PDF load error:', error);
    setIsLoading(false);
    setError('Failed to load PDF');
    if (onError) {
      onError('Failed to load PDF. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">⚠️</div>
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-[#2E2E2E] rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Preparing PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white dark:bg-[#171717] overflow-hidden">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayoutPluginInstance]}
          onDocumentLoad={handleDocumentLoad}
          onLoadError={handleLoadError}
        />
      </Worker>
    </div>
  );
};

export default PDFViewer;
