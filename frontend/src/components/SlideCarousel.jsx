import React, { useState, useEffect } from "react";

const SlideCarousel = ({ slides }) => {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setIndex((i) => (i < slides.length - 1 ? i + 1 : i));

  if (!slides || slides.length === 0) return <p>No slides to show.</p>;

  const { title, points } = slides[index];

  return (
    <div className="w-full max-w-xl mx-auto p-6 text-center bg-white rounded shadow text-gray-900">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <ul className="text-left list-disc list-inside mb-6">
        {points.map((pt, i) => (
          <li key={i} className="mb-1">{pt}</li>
        ))}
      </ul>
      <div className="flex justify-between items-center">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="font-semibold">{index + 1} / {slides.length}</span>
        <button
          onClick={next}
          disabled={index === slides.length - 1}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SlideCarousel;
