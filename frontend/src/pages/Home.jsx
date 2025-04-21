import { useState } from "react";
import "./Home.css";

const Home = () => {
  const [url, setUrl] = useState("");
  const [blog, setBlog] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!url) return alert("Enter a YouTube URL");

    setLoading(true);
    setBlog("");

    const response = await fetch("http://localhost:5000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    setBlog(data.blogPost);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4 text-black">YouTube to Blog Generator</h1>

      <input
        type="text"
        placeholder="Enter YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-96 p-2 border rounded text-black"
      />

      <button onClick={handleGenerate} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        {loading ? "Generating..." : "Generate Blog"}
      </button>

      {blog && (
        <div className="mt-4 p-4 border rounded bg-white w-3/4 shadow-lg">
          <h2 className="text-lg font-bold mb-2 text-black">Generated Blog</h2>
          <div
            className="blog-container prose-lg text-black leading-relaxed"
            dangerouslySetInnerHTML={{ __html: blog }}
          />
        </div>
      )}
    </div>
  );
};

export default Home;
