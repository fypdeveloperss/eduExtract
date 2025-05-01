const ErrorMessage = ({ message }) => {
    if (!message) return null;
  
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
        <div className="flex items-center text-red-700">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.293-6.707a1 1 0 111.414-1.414L10 11.414l1.293-1.293a1 1 0 111.414 1.414L11.414 12.828l1.293 1.293a1 1 0 01-1.414 1.414L10 14.242l-1.293 1.293a1 1 0 01-1.414-1.414l1.293-1.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{message}</span>
        </div>
      </div>
    );
  };
  
  export default ErrorMessage;
  