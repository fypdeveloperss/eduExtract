import React from "react";
import LoaderSpinner from "./LoaderSpinner";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center space-y-4">
        <LoaderSpinner size="xl" />
      </div>
    </div>
  );
}

export default PageLoader;
