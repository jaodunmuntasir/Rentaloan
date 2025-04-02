import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-600">404</h1>
        <h2 className="text-4xl font-bold text-gray-800 mt-4">Page Not Found</h2>
        <p className="text-gray-600 mt-6 text-lg">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="mt-10">
          <Link
            to="/"
            className="px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 