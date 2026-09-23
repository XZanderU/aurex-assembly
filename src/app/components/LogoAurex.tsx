import React from "react";

interface LogoProps {
  className?: string;
}

export const LogoAurex = ({ className = "w-8 h-8" }: LogoProps): React.JSX.Element => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 100 100" 
    className={className}
    fill="none"
  >
    <path 
      d="M50 15 L15 85 H35 L50 55 L65 85 H85 Z" 
      fill="currentColor" 
      className="text-blue-600"
    />
    <path 
      d="M35 85 L50 55 L85 20" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round"
      className="text-blue-400"
    />
    <circle cx="85" cy="20" r="8" fill="currentColor" className="text-blue-600" />
  </svg>
);