import { useState, useCallback } from "react";
import SlidesView from "./SlidesView";
import InputWithButton from "./InputWithButton";
import ErrorMessage from "./ErrorMessage";
import LoadingSpinner from "./LoadingSpinner";

const YtSlides = (props) => {

  return (
    <div className="min-h-screen flex flex-col">
      {props.slides && (
        <div className="mt-4 flex-1 flex flex-col w-full">
          <div className="px-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Your Presentation</h3>
              <div className="text-sm text-gray-500">
                Use arrow keys or click the navigation controls to move between slides
              </div>
            </div>
          </div>

          <div className="w-full flex-1 flex flex-col">
            <SlidesView html={props.slides} />
          </div>
        </div>
      )}
    </div>
  );
};

export default YtSlides;