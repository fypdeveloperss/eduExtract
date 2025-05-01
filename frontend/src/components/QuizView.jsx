import { useState, useEffect } from "react";

function QuizView({ quiz }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Start timer and stop when results are shown
  useEffect(() => {
    // Only run the timer if we're not showing results
    if (!showResults) {
      setStartTime(Date.now());
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(interval); // cleanup
    }
  }, [startTime, showResults]);

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

  const handleSubmit = () => {
    // Final elapsed time is captured at the moment of submission
    setShowResults(true);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const getScore = () =>
    quiz.reduce((score, q, idx) => q.answer === selectedAnswers[idx] ? score + 1 : score, 0);

  if (!quiz || quiz.length === 0) {
    return <p className="text-black">No quiz available for this video.</p>;
  }

  if (showResults) {
    const score = getScore();
    return (
      <div className="max-w-2xl mx-auto p-4 bg-white rounded shadow text-black">
        <h2 className="text-xl font-bold mb-4">Quiz Results</h2>
        <p className="mb-2">Your Score: {score} / {quiz.length}</p>
        <p className="mb-4">Time Taken: {formatTime(elapsedTime)}</p>

        <ul className="space-y-4">
          {quiz.map((q, idx) => {
            const isCorrect = selectedAnswers[idx] === q.answer;
            return (
              <li key={idx} className="p-4 border rounded">
                <p className="font-medium">{q.question}</p>
                <p>Your answer: <span className={isCorrect ? "text-green-600" : "text-red-600"}>{selectedAnswers[idx]}</span></p>
                {!isCorrect && <p>Correct answer: <span className="text-green-600">{q.answer}</span></p>}
              </li>
            );
          })}
        </ul>

        <button
          onClick={handleRestart}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Restart Quiz
        </button>
      </div>
    );
  }

  const question = quiz[currentQuestion];

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow text-black">
      {/* Top Bar: Progress + Timer */}
      <div className="flex justify-between items-center mb-4">
        <div className="w-3/4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium text-gray-600 ml-4">
          Time: {formatTime(elapsedTime)}
        </span>
      </div>

      <h2 className="text-lg font-semibold mb-2">Question {currentQuestion + 1} of {quiz.length}</h2>
      <p className="mb-4">{question.question}</p>

      <ul className="space-y-2">
        {question.options.map((option, index) => (
          <li
            key={index}
            onClick={() => handleOptionClick(option)}
            className={`px-4 py-2 border rounded cursor-pointer transition-all duration-200 ${
              selectedAnswers[currentQuestion] === option
                ? "bg-blue-100 border-blue-500"
                : "hover:bg-gray-100"
            }`}
          >
            {option}
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={handleBack}
          disabled={currentQuestion === 0}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
        >
          Back
        </button>

        {currentQuestion < quiz.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] == null}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswers[currentQuestion] == null}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}

export default QuizView;