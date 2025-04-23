import { useState } from "react";
import SlidesView from "./SlidesView";

const Contact = () => {
  const [url, setUrl] = useState("");
  const [slidesHtml, setSlidesHtml] = useState("");

  const generateSlides = async () => {
    const response = await fetch("http://localhost:5000/generate-slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    setSlidesHtml(data.slides); // assuming backend sends { slides: 'html...' }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">YouTube to Slides</h2>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="p-2 border rounded w-2/3 mr-2"
        placeholder="Enter YouTube video URL"
      />
      <button
        onClick={generateSlides}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Generate Slides
      </button>

      {slidesHtml && (
        <div className="mt-10">
          <SlidesView html={slidesHtml} />
        </div>
      )}
    </div>
  );
};

export default Contact;
