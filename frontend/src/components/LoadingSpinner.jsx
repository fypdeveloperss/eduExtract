const LoadingSpinner = ({ text = "Loading..." }) => {
    return (
      <div className="flex justify-center my-12">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg text-gray-700">{text}</p>
          <p className="text-sm text-gray-500 mt-2">
            This may take a moment depending on video length
          </p>
        </div>
      </div>
    );
  };
  
  export default LoadingSpinner;
  