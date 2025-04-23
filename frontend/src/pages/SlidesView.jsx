import { useEffect } from "react";
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/black.css";

const SlidesView = ({ html }) => {
  useEffect(() => {
    Reveal.initialize();
  }, []);

  return (
    <div className="reveal">
      <div className="slides" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default SlidesView;
