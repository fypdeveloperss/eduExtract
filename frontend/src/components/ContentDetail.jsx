import React from "react";

const ContentDetail = ({ content }) => {
  if (!content) {
    return <div className="p-4 text-center text-gray-500">No content selected</div>;
  }

  const renderContent = () => {
    switch (content.type) {
      case 'blog':
        // For HTML content, use dangerouslySetInnerHTML
        return (
          <div 
            className="blog-content max-w-none" 
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
      default:
        return <div className="p-4">Content type not supported</div>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {content.title}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="capitalize">{content.type}</span>
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