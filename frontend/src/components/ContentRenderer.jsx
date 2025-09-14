import React from 'react';

const ContentRenderer = ({ content }) => {
  if (!content) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-700 dark:text-gray-300">No content available</p>
      </div>
    );
  }

  // Helper function to render content based on its type
  const renderContentData = () => {
    const contentType = content.contentType || content.type;
    const contentData = content.contentData || content.content;
    
    switch (contentType) {
      case 'blog':
        // For HTML content, use dangerouslySetInnerHTML
        return (
          <div 
            className="blog-content max-w-none" 
            dangerouslySetInnerHTML={{ __html: contentData }} 
          />
        );
      case 'flashcards':
        const flashcards = Array.isArray(contentData) ? contentData : [];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flashcards.map((card, index) => (
              <div key={index} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700">
                <h3 className="font-semibold text-lg mb-2">{card.question || card.front}</h3>
                <p className="text-gray-700 dark:text-gray-300">{card.answer || card.back}</p>
              </div>
            ))}
          </div>
        );
      case 'slides':
        const slides = Array.isArray(contentData) ? contentData : [];
        return (
          <div className="space-y-6">
            {slides.map((slide, index) => (
              <div key={index} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700">
                <h3 className="font-bold text-xl mb-3">{slide.title}</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {(slide.points || []).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      case 'quiz':
        const questions = Array.isArray(contentData) ? contentData : [];
        return (
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={index} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700">
                <h3 className="font-bold text-lg mb-3">{q.question || q.text}</h3>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                  {(q.options || []).map((option, i) => (
                    <li key={i} className={`${option === q.answer ? 'font-semibold text-green-600 dark:text-green-400' : ''}`}>
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
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">{contentData}</p>
        );
      default:
        return <p className="text-gray-700 dark:text-gray-300">Unsupported content type.</p>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-[#121212] dark:text-[#fafafa]">{content.title}</h1>
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-xl p-6 sm:p-8">
        {renderContentData()}
      </div>
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Generated on: {new Date(content.createdAt).toLocaleDateString()}
        {(content.url || content.originalText) && <p>Source: <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">{content.url || 'Original Text'}</a></p>}
        {content.filePath && <p>Original File: {content.filePath.split('/').pop()}</p>}
      </div>
    </div>
  );
};

export default ContentRenderer;