import React from "react";

const SIZE_MAP = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
};

const BORDER_MAP = {
  xs: "border-2",
  sm: "border-2",
  md: "border-4",
  lg: "border-4",
  xl: "border-4",
};

const LoaderSpinner = ({ size = "md", className = "" }) => {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const borderClass = BORDER_MAP[size] || BORDER_MAP.md;

  return (
    <span
      className={`inline-block animate-spin rounded-full ${borderClass} border-gray-300 dark:border-gray-600 border-t-[#171717] dark:border-t-[#fafafa] ${sizeClass} ${className}`}
      aria-hidden="true"
    />
  );
};

export default LoaderSpinner;

