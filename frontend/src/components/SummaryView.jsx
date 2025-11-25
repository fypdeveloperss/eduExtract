import React, { useState } from "react";
import { Download } from "lucide-react";
import api from "../utils/axios";
import { useCustomAlerts } from "../hooks/useCustomAlerts";
import "./SummaryView.css";

function SummaryView({ summary }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { error } = useCustomAlerts();

  const handleDownload = async () => {
    if (!summary) return;
    
    setIsDownloading(true);
    try {
      const response = await api.post('/download-summary', {
        summary: summary,
        title: 'Content Summary'
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Content_Summary.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      error('Failed to download summary. Please try again.', 'Download Error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="summary-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="summary-title">Video Summary</h2>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={16} />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>
      <div 
        className="summary-text" 
        dangerouslySetInnerHTML={{ __html: summary }}
      />
    </div>
  );
}

export default SummaryView;
