import React from "react";

const QuizDisplay = ({ quiz }) => {
  if (!quiz || quiz.length === 0) {
    return <div className="p-4 text-center text-gray-500">No quiz data available</div>;
  }

  return (
    <div className="space-y-6">
      {quiz.map((q, index) => (
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
                {option === q.answer && (
                  <span className="ml-2 text-sm font-medium">(Correct Answer)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default QuizDisplay;
