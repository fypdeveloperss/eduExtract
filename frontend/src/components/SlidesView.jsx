import React from "react";
import SlideCarousel from "./SlideCarousel";

const SlidesView = ({ pptxBase64, slides }) => {
  const downloadPptx = () => {
    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${pptxBase64}`;
    link.download = "presentation.pptx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="text-center p-6">
      {/* Slide Carousel Section */}
      {slides && slides.length > 0 ? (
        <div className="mb-6">
          <SlideCarousel slides={slides} />
        </div>
      ) : (
        <p className="text-gray-500 mb-6">No slides to display.</p>
      )}

      {/* Download Button */}
      <button
        onClick={downloadPptx}
        disabled={!pptxBase64}
        className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
      >
        Download PPTX
      </button>
    </div>
  );
};

export default SlidesView;
