import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext'; // Assuming you have this context for user ID and token

function Content() {
  const { contentId } = useParams(); // Get contentId from URL
  const { user } = useAuth(); // Get user from auth context
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContentDetails = async () => {
      if (!user) {
        setError("Please sign in to view your content.");
        setLoading(false);
        return;
      }
      if (!contentId) {
        setError("No content ID provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const idToken = await user.getIdToken();
        const response = await fetch(`http://localhost:5000/api/content/${contentId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Unauthorized to view this content.");
          }
          throw new Error(`Failed to fetch content: ${response.statusText}`);
        }

        const data = await response.json();
        setContent(data);
      } catch (err) {
        console.error("Error fetching content details:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchContentDetails();
  }, [contentId, user]); // Re-fetch if contentId or user changes

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-600 dark:text-red-400">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-700 dark:text-gray-300">Content not found.</p>
      </div>
    );
  }

  // Helper function to render content based on its type
  const renderContentData = () => {
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
              <div key={index} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700">
                <h3 className="font-semibold text-lg mb-2">{card.question}</h3>
                <p className="text-gray-700 dark:text-gray-300">{card.answer}</p>
              </div>
            ))}
          </div>
        );
      case 'slides':
        return (
          <div className="space-y-6">
            {content.contentData.map((slide, index) => (
              <div key={index} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700">
                <h3 className="font-bold text-xl mb-3">{slide.title}</h3>
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
              <div key={index} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700">
                <h3 className="font-bold text-lg mb-3">{q.question}</h3>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                  {q.options.map((option, i) => (
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
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">{content.contentData}</p>
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
        {content.url && <p>Source: <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">{content.url}</a></p>}
        {content.filePath && <p>Original File: {content.filePath.split('/').pop()}</p>}
      </div>
    </div>
  );
}

export default Content;
