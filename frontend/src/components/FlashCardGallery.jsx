import { useState } from "react";
import { Download } from "lucide-react";
import api from "../utils/axios";
import { useCustomAlerts } from "../hooks/useCustomAlerts";
import Flashcard from "./FlashCard";

function FlashCardGallery(props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { error } = useCustomAlerts();

  const handleDownload = async () => {
    if (!props.flashcards) return;
    
    setIsDownloading(true);
    try {
      const response = await api.post('/download-flashcards', {
        flashcards: props.flashcards,
        title: 'Flashcards'
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Flashcards.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      error('Failed to download flashcards. Please try again.', 'Download Error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-8 text-center min-h-screen bg-white dark:bg-[#171717]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">Flashcards</h2>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={16} />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {props.flashcards.map((card, index) => (
          <Flashcard
            key={index}
            question={card.question}
            answer={card.answer}
          />
        ))}
      </div>
    </div>
  );
}

export default FlashCardGallery;
