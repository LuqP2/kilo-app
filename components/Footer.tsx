import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white mt-auto border-t border-slate-200">
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Kilo.</p>
      </div>
    </footer>
  );
};

export default Footer;
