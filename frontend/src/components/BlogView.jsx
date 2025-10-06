import { useState } from "react";
import { Download } from "lucide-react";
import api from "../utils/axios";
import "./BlogView.css";

const BlogView = (props) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!props.blog) return;
    
    setIsDownloading(true);
    try {
      const response = await api.post('/download-blog', {
        blogContent: props.blog,
        title: 'Generated Blog'
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Generated_Blog.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download blog. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {props.blog && (
        <div className="blog-wrapper">
          <div className="flex items-center justify-between mb-4">
            <h2 className="blog-title">Generated Blog</h2>
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
            className="blog-container"
            dangerouslySetInnerHTML={{ __html: props.blog }}
          />
        </div>
      )}
    </>
  );
};

export default BlogView;
