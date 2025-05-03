import { useState } from "react";
import "./BlogView.css";

const BlogView = (props) => {
  return (
    <>
      {props.blog && (
        <div className="blog-wrapper">
          <h2 className="blog-title">Generated Blog</h2>
          <div
            className="blog-container"
            dangerouslySetInnerHTML={{ __html: props.blog }}
          />
        </div>
      )}
    </>
  );
};

export default BlogView;
