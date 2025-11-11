import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import api from "../utils/axios";

function QuizView({ quiz, quizId }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Start timer and stop when results are shown
  useEffect(() => {
    // Only run the timer if we're not showing results
    if (!showResults) {
      const currentStartTime = Date.now();
      setStartTime(currentStartTime);
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - currentStartTime) / 1000));
      }, 1000);

      return () => clearInterval(interval); // cleanup
    }
  }, [showResults]); // Remove startTime from dependencies

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const handleOptionClick = (option) => {
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestion] = option;
    setSelectedAnswers(updatedAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    // Final elapsed time is captured at the moment of submission
    setShowResults(true);
    
    // Save quiz attempt if quizId is provided
    if (quizId) {
      try {
        console.log('Saving quiz attempt with quizId:', quizId);
        console.log('User answers:', selectedAnswers);
        console.log('Time spent:', elapsedTime);
        
        const response = await api.post('/api/content/quiz-attempt', {
          quizId,
          userAnswers: selectedAnswers,
          timeSpent: elapsedTime
        });
        
        console.log('Quiz attempt saved successfully:', response.data);
      } catch (error) {
        console.error('Failed to save quiz attempt:', error);
        console.error('Error details:', error.response?.data);
        // Don't show error to user as it's not critical
      }
    } else {
      console.warn('No quizId provided, quiz attempt not saved');
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const getScore = () =>
    quiz.reduce(
      (score, q, idx) => {
        // Support both 'answer' and 'correctAnswer' fields
        const correctAnswer = q.correctAnswer || q.answer;
        return correctAnswer === selectedAnswers[idx] ? score + 1 : score;
      },
      0
    );

  const handleDownload = async () => {
    if (!quiz) return;
    
    setIsDownloading(true);
    try {
      const response = await api.post('/download-quiz', {
        quiz: quiz,
        title: 'Quiz'
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Quiz.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download quiz. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!quiz || quiz.length === 0) {
    return <p className="text-gray-900 dark:text-[#fafafa]">No quiz available for this video.</p>;
  }

  if (showResults) {
    const score = getScore();
    return (
      <div className="max-w-2xl mx-auto p-4 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717]">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-[#fafafa]">Quiz Results</h2>
        <div className="mb-6 p-4 bg-gray-100 dark:bg-[#fafafa1a] rounded-lg border border-gray-200 dark:border-[#fafafa1a]">
          <p className="text-lg font-semibold text-gray-900 dark:text-[#fafafa] mb-1">
            Your Score: {getScore()} / {quiz.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-[#fafafa99]">Time Taken: {formatTime(elapsedTime)}</p>
        </div>

        <ul className="space-y-4">
          {quiz.map((q, idx) => {
            // Support both 'answer' and 'correctAnswer' fields
            const correctAnswer = q.correctAnswer || q.answer;
            const isCorrect = selectedAnswers[idx] === correctAnswer;
            return (
              <li
                key={idx}
                className="p-4 border rounded-lg border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E]"
              >
                <p className="font-medium text-gray-900 dark:text-[#fafafa] mb-2">{q.question}</p>
                <p className="text-sm text-gray-600 dark:text-[#fafafa99] mb-1">
                  Your answer:{" "}
                  <span
                    className={`font-semibold ${isCorrect ? "text-gray-700 dark:text-[#fafafacc]" : "text-gray-700 dark:text-[#fafafacc]"}`}
                  >
                    {selectedAnswers[idx]}
                  </span>
                </p>
                {!isCorrect && (
                  <p className="text-sm text-gray-600 dark:text-[#fafafa99]">
                    Correct answer:{" "}
                    <span className="font-semibold text-gray-900 dark:text-[#fafafa]">{correctAnswer}</span>
                  </p>
                )}
                <div className={`mt-2 inline-block px-2 py-1 rounded text-xs font-medium ${
                  isCorrect 
                    ? 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc]' 
                    : 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc]'
                }`}>
                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleRestart}
            className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:bg-[#1a1a1a] dark:hover:bg-[#fafafacc] transition-colors font-medium"
          >
            Restart Quiz
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>
    );
  }

  const question = quiz[currentQuestion];

  return (
    <div className="max-w-xl mx-auto p-4 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717]">
      {/* Top Bar: Progress + Timer */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 bg-gray-200 dark:bg-[#fafafa1a] rounded-full h-2 mr-4">
          <div
            className="bg-[#171717] dark:bg-[#fafafa] h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestion + 1) / quiz.length) * 100}%`,
            }}
          ></div>
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-[#fafafa99] whitespace-nowrap">
          Time: {formatTime(elapsedTime)}
        </span>
      </div>

      <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-[#fafafa]">
        Question {currentQuestion + 1} of {quiz.length}
      </h2>
      <p className="mb-6 text-gray-700 dark:text-[#fafafacc]">{question.question}</p>

      <ul className="space-y-3">
        {question.options.map((option, index) => (
          <li
            key={index}
            onClick={() => handleOptionClick(option)}
            className={`px-4 py-3 border rounded-lg cursor-pointer transition-all duration-200 text-gray-900 dark:text-[#fafafa]
            ${
              selectedAnswers[currentQuestion] === option
                ? "bg-gray-100 dark:bg-[#fafafa1a] border-gray-300 dark:border-[#fafafa2a] font-medium"
                : "hover:bg-gray-50 dark:hover:bg-[#1E1E1E] border-gray-200 dark:border-[#fafafa1a]"
            }`}
          >
            {option}
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handleBack}
          disabled={currentQuestion === 0}
          className="px-4 py-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Back
        </button>

        {currentQuestion < quiz.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] == null}
            className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:bg-[#1a1a1a] dark:hover:bg-[#fafafacc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswers[currentQuestion] == null}
            className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:bg-[#1a1a1a] dark:hover:bg-[#fafafacc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}

export default QuizView;
