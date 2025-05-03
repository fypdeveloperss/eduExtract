import { useState } from "react";

function Flashcard({ question, answer }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`w-80 h-40 max-h-100 p-5 rounded-xl shadow-md cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 overflow-auto 
        ${flipped ? "bg-blue-100 dark:bg-[#141414]" : "bg-white dark:bg-[#1f1f1f]"}`}
      onClick={() => setFlipped(!flipped)}
    >
      <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        {flipped ? "Answer" : "Question"}
      </h3>
      <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed break-words">
        {flipped ? answer : question}
      </p>
    </div>
  );
}

export default Flashcard;
