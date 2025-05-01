import { useState } from "react";
import Flashcard from "../components/FlashCard";
import axios from "axios";

function Flashcards() {
  const [url, setUrl] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);
    setFlashcards([]);

    try {
      const res = await axios.post("http://localhost:5000/generate-flashcards", { url });
      setFlashcards(res.data.flashcards || []);
    } catch (err) {
      console.error("Failed to fetch flashcards:", err);
    }

    setLoading(false);
  };

  return (
    <div className="p-8 text-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">🎴 YouTube to Flashcards</h1>

      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8">
        <input
          type="text"
          placeholder="Enter YouTube URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full md:w-1/2 px-4 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleGenerate}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-300"
        >
          {loading ? "Generating..." : "Generate Flashcards"}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {flashcards.map((card, index) => (
          <Flashcard key={index} question={card.question} answer={card.answer} />
        ))}
      </div>
    </div>
  );
}

export default Flashcards;
