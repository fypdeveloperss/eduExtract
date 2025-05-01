import { useState } from "react";

function Flashcard({ question, answer }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`w-64 max-h-60 p-5 rounded-xl shadow-md cursor-pointer transition-transform duration-300 ease-in-out bg-white hover:scale-105 overflow-auto ${
        flipped ? "bg-blue-50" : "bg-white"
      }`}
      onClick={() => setFlipped(!flipped)}
    >
      <h3 className="text-sm font-semibold mb-2 text-gray-700">
        {flipped ? "Answer" : "Question"}
      </h3>
      <p className="text-base text-gray-800 leading-relaxed break-words">
        {flipped ? answer : question}
      </p>
    </div>
  );
}

export default Flashcard;
