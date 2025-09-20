import React from "react";

const ContentDetail = ({ content }) => {
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

  const renderContent = () => {
    switch (contentType) {
      case 'blog':
        // For HTML content, use dangerouslySetInnerHTML
        return (
          <div 
            className="blog-content max-w-none bg-white dark:bg-gray-800 p-6 rounded-lg" 
            dangerouslySetInnerHTML={{ __html: content.contentData }} 
          />
        );
      case 'flashcards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.contentData.map((card, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{card.question}</h3>
                <p className="text-gray-700 dark:text-gray-300">{card.answer}</p>
              </div>
            ))}
          </div>
        );
      case 'slides':
        return (
          <div className="space-y-6">
            {content.contentData.map((slide, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-xl mb-3 text-gray-900 dark:text-white">{slide.title}</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {slide.points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      case 'quiz':
        return (
          <div className="space-y-6">
            {content.contentData.map((q, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
                  Question {index + 1}: {q.question}
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  {q.options.map((option, i) => (
                    <li 
                      key={i} 
                      className={`p-2 rounded ${
                        option === q.answer 
                          ? 'bg-green-100 dark:bg-green-900/30 font-semibold text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' 
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      {option}
                      {option === q.answer && <span className="ml-2 text-sm">(Correct Answer)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      case 'summary':
        return (
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">{content.contentData}</p>
        );
      case 'document':
      case 'personal':
        // Handle marketplace document/personal content types
        if (typeof content.contentData === 'string') {
          return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 text-sm">
                {content.contentData}
              </pre>
            </div>
          );
        } else if (content.contentData && typeof content.contentData === 'object') {
          return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 text-sm">
                {JSON.stringify(content.contentData, null, 2)}
              </pre>
            </div>
          );
        } else {
          // Fallback to description if no contentData
          return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {content.title}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
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
                className="text-blue-500 hover:text-blue-600"
              >
                View Source
              </a>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default ContentDetail; 