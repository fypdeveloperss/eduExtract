import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext'; // Assuming you have this context for user ID and token

// Add styles for HTML content rendering
const summaryStyles = `
  .prose h1, .prose h2, .prose h3, .prose h4 {
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    line-height: 1.3;
  }
  .prose h1 { font-size: 2rem; }
  .prose h2 { font-size: 1.75rem; }
  .prose h3 { font-size: 1.5rem; }
  .prose p { margin-bottom: 1rem; line-height: 1.8; }
  .prose ul, .prose ol { margin-left: 1.5rem; margin-bottom: 1rem; }
  .prose li { margin-bottom: 0.5rem; line-height: 1.7; }
  .prose strong, .prose b { font-weight: 600; }
  .prose em, .prose i { font-style: italic; }
`;

function Content() {
  const { contentId } = useParams(); // Get contentId from URL
  const { user } = useAuth(); // Get user from auth context
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);

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
        
        // If this is a quiz, fetch quiz attempts
        if (data.type === 'quiz') {
          try {
            const quizAttemptsResponse = await fetch(`http://localhost:5000/api/content/user/quiz-attempts`, {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            
            if (quizAttemptsResponse.ok) {
              const quizAttempts = await quizAttemptsResponse.json();
              // Find the attempt for this specific quiz
              const attempt = quizAttempts.find(attempt => {
                const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
                return attemptQuizId === contentId;
              });
              setQuizAttempt(attempt);
            }
          } catch (err) {
            console.error("Error fetching quiz attempts:", err);
            // Don't set error, just continue without quiz attempt data
          }
        }
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
                  <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-[#fafafa]">{q.question}</h3>
                  
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
                      
                      return (
                        <li key={i} className={`p-3 rounded-lg border ${
                          isCorrectAnswer 
                            ? 'bg-gray-100 dark:bg-[#fafafa1a] font-semibold text-gray-900 dark:text-[#fafafa] border-gray-300 dark:border-[#fafafa2a]' 
                            : isUserAnswer 
                              ? 'bg-gray-50 dark:bg-[#1E1E1E] font-semibold text-gray-700 dark:text-[#fafafacc] border-gray-200 dark:border-[#fafafa1a]'
                              : 'bg-gray-50 dark:bg-[#1E1E1E] border-gray-200 dark:border-[#fafafa1a]'
                        }`}>
                          {option}
                          {isCorrectAnswer && <span className="ml-2 text-sm text-gray-600 dark:text-[#fafafa99]">(Correct Answer)</span>}
                          {isUserAnswer && !isCorrectAnswer && <span className="ml-2 text-sm text-gray-600 dark:text-[#fafafa99]">(Your Answer)</span>}
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
      default:
        return <p className="text-gray-700 dark:text-gray-300">Unsupported content type.</p>;
    }
  };

  return (
    <>
      <style>{summaryStyles}</style>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-[#121212] dark:text-[#fafafa]">{content.title}</h1>
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-xl p-6 sm:p-8">
          {renderContentData()}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-[#fafafa99]">
          Generated on: {new Date(content.createdAt).toLocaleDateString()}
          {content.url && <p>Source: <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-[#fafafa99] hover:text-gray-900 dark:hover:text-[#fafafa] hover:underline transition-colors">{content.url}</a></p>}
          {content.filePath && <p>Original File: {content.filePath.split('/').pop()}</p>}
        </div>
      </div>
    </>
  );
}

export default Content;
