import React from "react";
import SlideCarousel from "./SlideCarousel";
import { Download } from "lucide-react";

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
    <div className="text-center">
      {/* Header Section */}
      <div className="mb-8">
        <h3 className="text-[#171717] dark:text-[#fafafa] text-xl font-semibold mb-2">
          Interactive Slides
        </h3>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Navigate through the slides or download for offline viewing
        </p>
      </div>

      {/* Slide Carousel Section */}
      {slides && slides.length > 0 ? (
        <div className="mb-6">
          <SlideCarousel slides={slides} />
        </div>
      ) : (
        <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">
          No slides to display.
        </p>
      )}

      {/* Download Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={downloadPptx}
          disabled={!pptxBase64}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-all"
        >
          <Download size={20} />
          Download Presentation
        </button>
      </div>
    </div>
  );
};

export default SlidesView;
