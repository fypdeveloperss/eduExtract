import { useState } from "react";
import BlogView from "../components/YtBlogs";
import SlidesView from "../components/YtSlides";
import FlashCardGallery from "../components/FlashCardGallery";
import axios from "axios";

function Home() {
  const [activeTab, setActiveTab] = useState("blog");
  const [url, setUrl] = useState("");
  const [blog, setBlog] = useState("");
  const [slides, setSlides] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!url) return alert("Enter a YouTube URL");
    setLoading(true);

    try {
      const [blogRes, slidesRes, flashRes] = await Promise.all([
        axios.post("http://localhost:5000/generate", { url }),
        axios.post("http://localhost:5000/generate-slides", { url }),
        axios.post("http://localhost:5000/generate-flashcards", { url })
      ]);

      setBlog(blogRes.data.blogPost || "");
      setSlides(slidesRes.data.slides || "");
      setFlashcards(flashRes.data.flashcards || []);
    } catch (error) {
      console.error("Error generating resources:", error);
    } finally {
      setLoading(false);
    }
  };





  return (
    <div className="p-6 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🎓 YouTube Learning Extractor</h1>

      <div className="flex items-center justify-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter YouTube URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full max-w-xl px-4 py-2 border rounded-lg shadow"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      

      <div className="flex justify-center gap-6 mb-6 border-b pb-2">
        <button
          onClick={() => setActiveTab("blog")}
          className={`px-4 py-2 font-medium ${
            activeTab === "blog" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
          }`}
        >
          Blog
        </button>
        <button
          onClick={() => setActiveTab("slides")}
          className={`px-4 py-2 font-medium ${
            activeTab === "slides" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
          }`}
        >
          Slides
        </button>
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`px-4 py-2 font-medium ${
            activeTab === "flashcards" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
          }`}
        >
          Flashcards
        </button>
      </div>

      {/* Tabs Content */}
      <div className="min-h-[300px]">
        {activeTab === "blog" && <BlogView blog={blog} />}
        {activeTab === "slides" && <SlidesView slides={slides} />}
        {activeTab === "flashcards" && <FlashCardGallery flashcards={flashcards} />}
      </div>
    </div>
  );
}

export default Home;
