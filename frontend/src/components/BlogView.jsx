import { useState } from "react";
import "./BlogView.css";

const BlogView = (props) => {
  return (
    <>
      {props.blog && (
        <div className="mt-4 p-4 border rounded bg-white w-4/4 shadow-lg">
          <h2 className="text-lg font-bold mb-2 text-black">Generated Blog</h2>
          <div
            className="blog-container prose-lg text-black leading-relaxed"
            dangerouslySetInnerHTML={{ __html: props.blog }}
          />
        </div>
      )}
    
    </>
  );
};

export default BlogView;
