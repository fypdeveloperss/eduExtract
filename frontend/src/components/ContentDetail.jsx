import React, { useState } from "react";
import { Download } from "lucide-react";
import api from "../utils/axios";
import { useCustomAlerts } from "../hooks/useCustomAlerts";

const ContentDetail = ({ content, quizAttempt }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { error, warning } = useCustomAlerts();

  if (!content) {
    return <div className="p-4 text-center text-gray-500">No content selected</div>;
  }

  // Ensure we have a content type to work with
  const contentType = content.type || content.contentType;
  if (!contentType) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">
          Content type is missing. Unable to display content properly.
        </p>
      </div>
    );
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      let endpoint = '';
      let payload = {};
      let filename = '';

      switch (contentType) {
        case 'blog':
          endpoint = '/download-blog';
          payload = { blogContent: content.contentData, title: content.title };
          filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          break;
        case 'summary':
          endpoint = '/download-summary';
          payload = { summary: content.contentData, title: content.title };
          filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          break;
        case 'quiz':
          endpoint = '/download-quiz';
          payload = { quiz: content.contentData, title: content.title };
          filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          break;
        case 'flashcards':
          endpoint = '/download-flashcards';
          payload = { flashcards: content.contentData, title: content.title };
          filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          break;
        case 'slides':
          // For slides, call the backend to generate a properly formatted PowerPoint
          try {
            const response = await api.post('/generate-slides', {
              url: content.url || 'file-upload',
              slides: content.contentData
            }, {
              responseType: 'blob'
            });

            // Create download link for PowerPoint file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            return;
          } catch (error) {
            console.error('PowerPoint generation failed:', error);
            // Fallback to text download
            if (content.contentData && Array.isArray(content.contentData)) {
              let slidesText = `${content.title}\n\n`;
              content.contentData.forEach((slide, index) => {
                // Support both 'content' and 'points'
                const bulletPoints = slide.content || slide.points || [];
                slidesText += `Slide ${index + 1}: ${slide.title}\n`;
                bulletPoints.forEach((point, pointIndex) => {
                  slidesText += `  ${pointIndex + 1}. ${point}\n`;
                });
                slidesText += '\n';
              });
              
              const blob = new Blob([slidesText], { type: 'text/plain' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
              return;
            } else {
              warning('No slides data available for download', 'Download Unavailable');
              return;
            }
          }
        default:
          warning(`Download not supported for content type: ${contentType}`, 'Unsupported Content');
          return;
      }

      const response = await api.post(endpoint, payload, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Download failed:', err);
      error(`Failed to download ${contentType}: ${err.message || 'Please try again.'}`, 'Download Error');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderContent = () => {
    switch (contentType) {
      case 'blog':
        // For HTML content, use dangerouslySetInnerHTML
        return (
          <div 
            className="blog-content max-w-none bg-white dark:bg-[#171717] p-6 rounded-lg prose dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-[#fafafa] prose-p:text-gray-800 dark:prose-p:text-[#fafafacc]" 
            dangerouslySetInnerHTML={{ __html: content.contentData }} 
          />
        );
      case 'flashcards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.contentData.map((card, index) => (
              <div key={index} className="bg-white dark:bg-[#171717] p-4 rounded-lg border border-gray-200 dark:border-[#fafafa1a]">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-[#fafafa]">{card.question}</h3>
                <p className="text-gray-700 dark:text-[#fafafacc]">{card.answer}</p>
              </div>
            ))}
          </div>
        );
      case 'slides':
        return (
          <div className="space-y-6">
            {content.contentData.map((slide, index) => {
              // Support both 'content' and 'points' for backward compatibility
              const bulletPoints = slide.content || slide.points || [];
              
              return (
                <div key={index} className="bg-white dark:bg-[#171717] p-6 rounded-lg border border-gray-200 dark:border-[#fafafa1a]">
                  <h3 className="font-bold text-xl mb-3 text-gray-900 dark:text-[#fafafa]">{slide.title}</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-[#fafafacc]">
                    {bulletPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      case 'quiz':
        return (
          <div className="space-y-6">
            {content.contentData.map((q, index) => {
              const userAnswer = quizAttempt?.userAnswers?.[index];
              // Support both 'answer' and 'correctAnswer' fields
              const correctAnswer = q.correctAnswer || q.answer;
              const isCorrect = userAnswer === correctAnswer;
              
              return (
                <div key={index} className="bg-white dark:bg-[#171717] p-6 rounded-lg border border-gray-200 dark:border-[#fafafa1a]">
                  <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-[#fafafa]">
                    Question {index + 1}: {q.question}
                  </h3>
                  
                  {/* Show user's answer and result if quiz attempt exists */}
                  {quizAttempt && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-[#fafafa1a] border border-gray-200 dark:border-[#fafafa1a]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-[#fafafa]">Your Answer:</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          isCorrect 
                            ? 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc]' 
                            : 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc]'
                        }`}>
                          {userAnswer || 'No answer provided'}
                        </span>
                        <span className={`text-sm font-medium ${
                          isCorrect 
                            ? 'text-gray-700 dark:text-[#fafafacc]' 
                            : 'text-gray-700 dark:text-[#fafafacc]'
                        }`}>
                          {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <ul className="space-y-2 text-gray-700 dark:text-[#fafafacc]">
                    {q.options.map((option, i) => {
                      const isUserAnswer = quizAttempt && userAnswer === option;
                      const isCorrectAnswer = option === correctAnswer;
                      const showCorrectAnswer = quizAttempt; // Only show correct answer if quiz has been attempted
                      
                      return (
                        <li 
                          key={i} 
                          className={`p-3 rounded-lg border ${
                            showCorrectAnswer && isCorrectAnswer 
                              ? 'bg-gray-100 dark:bg-[#fafafa1a] font-semibold text-gray-900 dark:text-[#fafafa] border-gray-300 dark:border-[#fafafa2a]' 
                              : showCorrectAnswer && isUserAnswer && !isCorrectAnswer
                                ? 'bg-gray-50 dark:bg-[#1E1E1E] font-semibold text-gray-700 dark:text-[#fafafacc] border-gray-200 dark:border-[#fafafa1a]'
                                : 'bg-gray-50 dark:bg-[#1E1E1E] border-gray-200 dark:border-[#fafafa1a]'
                          }`}
                        >
                          {option}
                          {showCorrectAnswer && isCorrectAnswer && <span className="ml-2 text-sm text-gray-600 dark:text-[#fafafa99]">(Correct Answer)</span>}
                          {showCorrectAnswer && isUserAnswer && !isCorrectAnswer && <span className="ml-2 text-sm text-gray-600 dark:text-[#fafafa99]">(Your Answer)</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      case 'summary':
        return (
          <div 
            className="text-gray-800 dark:text-[#fafafacc] leading-relaxed text-lg prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-[#fafafa]"
            dangerouslySetInnerHTML={{ __html: content.contentData }}
          />
        );
      case 'document':
      case 'personal':
        // Handle marketplace document/personal content types
        if (typeof content.contentData === 'string') {
          return (
            <div className="bg-white dark:bg-[#171717] p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-[#fafafacc] text-sm">
                {content.contentData}
              </pre>
            </div>
          );
        } else if (content.contentData && typeof content.contentData === 'object') {
          return (
            <div className="bg-white dark:bg-[#171717] p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-[#fafafacc] text-sm">
                {JSON.stringify(content.contentData, null, 2)}
              </pre>
            </div>
          );
        } else {
          // Fallback to description if no contentData
          return (
            <div className="bg-white dark:bg-[#171717] p-4 rounded-lg border">
              <p className="text-gray-800 dark:text-[#fafafacc] leading-relaxed">
                {content.description || 'No content available for preview.'}
              </p>
            </div>
          );
        }
      default:
        // Enhanced default case with better fallback
        return (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
              Content Type Not Fully Supported: "{contentType}"
            </h4>
            {content.contentData ? (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">Raw Content:</h5>
                <pre className="whitespace-pre-wrap text-yellow-700 dark:text-yellow-300 text-xs bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded max-h-64 overflow-y-auto">
                  {typeof content.contentData === 'string' 
                    ? content.contentData 
                    : JSON.stringify(content.contentData, null, 2)
                  }
                </pre>
              </div>
            ) : (
              <p className="text-yellow-700 dark:text-yellow-300">
                {content.description || 'No content data available for this item.'}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#171717] rounded-lg border border-gray-200 dark:border-[#fafafa1a] p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa]">
            {content.title}
          </h2>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-[#fafafa99]">
          <span className="capitalize">{contentType}</span>
          <span>•</span>
          <span>{new Date(content.createdAt).toLocaleDateString()}</span>
          {content.url && (
            <>
              <span>•</span>
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-[#fafafa99] hover:text-gray-900 dark:hover:text-[#fafafa] transition-colors"
              >
                View Source
              </a>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-[#fafafa1a] pt-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default ContentDetail; 