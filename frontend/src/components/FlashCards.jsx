import { useState } from "react";
import Flashcard from "./FlashCard";
import axios from "axios";

function Flashcards(props) {


  return (
    <div className="p-8 text-center min-h-screen bg-gray-50">
      <div className="flex flex-wrap justify-center gap-6">
        {props.flashcards.map((card, index) => (
          <Flashcard key={index} question={card.question} answer={card.answer} />
        ))}
      </div>
    </div>
  );
}

export default Flashcards;
