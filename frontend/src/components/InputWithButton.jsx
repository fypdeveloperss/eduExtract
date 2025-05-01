const InputWithButton = ({
    value,
    onChange,
    onClick,
    placeholder = "Enter something...",
    isLoading = false,
    buttonText = "Submit",
  }) => {
    return (
      <div className="flex flex-col md:flex-row mb-4">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={isLoading}
          className="p-3 text-black rounded-lg border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none transition-all w-full md:w-2/3 mb-2 md:mb-0 md:mr-2"
        />
  
        <button
          onClick={onClick}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg"
          } text-white`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </span>
          ) : (
            buttonText
          )}
        </button>
      </div>
    );
  };
  
  export default InputWithButton;