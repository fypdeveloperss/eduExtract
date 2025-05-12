import Flashcard from "./FlashCard";

function FlashCardGallery(props) {
  return (
    <div className="p-8 text-center min-h-screen bg-white dark:bg-[#1a1a1a]">
      <div className="flex flex-wrap justify-center gap-6">
        {props.flashcards.map((card, index) => (
          <Flashcard
            key={index}
            question={card.question}
            answer={card.answer}
          />
        ))}
      </div>
    </div>
  );
}

export default FlashCardGallery;
