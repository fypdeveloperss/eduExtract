import React, { useState, useEffect } from "react";

const SlideCarousel = ({ slides }) => {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setIndex((i) => (i < slides.length - 1 ? i + 1 : i));

  if (!slides || slides.length === 0) return (
    <p className="text-[#171717cc] dark:text-[#fafafacc]">No slides to show.</p>
  );

  const { title, points } = slides[index];

  return (
    <div className="w-full max-w-xl mx-auto p-6 text-center bg-[#FFFFFF] dark:bg-[#171717] rounded-lg shadow-lg border border-[#EEEEEE] dark:border-[#2E2E2E]">
      <h2 className="text-2xl font-bold mb-4 text-[#171717] dark:text-[#fafafa]">
        {title}
      </h2>
      <ul className="text-left list-disc list-inside mb-6">
        {points.map((pt, i) => (
          <li 
            key={i} 
            className="mb-1 text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
          >
            {pt}
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-all"
        >
          Previous
        </button>
        <span className="font-semibold text-[#171717cc] dark:text-[#fafafacc]">
          <span className="text-blue-500">{index + 1}</span> / {slides.length}
        </span>
        <button
          onClick={next}
          disabled={index === slides.length - 1}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SlideCarousel;
