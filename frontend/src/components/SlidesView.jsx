import React from "react";

const SlidesView = ({ pptxBase64 }) => {
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
      <button
        onClick={downloadPptx}
        disabled={!pptxBase64}
        className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
      >
        Download PPTX
      </button>
    </div>
  );
};

export default SlidesView;
