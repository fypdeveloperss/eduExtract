import React from "react";
import BlogView from "./BlogView";
import SlidesView from "./SlidesView";
import FlashCardGallery from "./FlashCardGallery";
import QuizView from "./QuizView";
import SummaryView from "./SummaryView";

const ContentDetail = ({ content }) => {
  if (!content) {
    return <div className="p-4 text-center text-gray-500">No content selected</div>;
  }

  const renderContent = () => {
    switch (content.type) {
      case 'blog':
        return <BlogView blog={content.contentData} />;
      case 'slides':
        return <SlidesView slides={content.contentData} />;
      case 'flashcards':
        return <FlashCardGallery flashcards={content.contentData} />;
      case 'quiz':
        return <QuizView quiz={content.contentData} />;
      case 'summary':
        return <SummaryView summary={content.contentData} />;
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