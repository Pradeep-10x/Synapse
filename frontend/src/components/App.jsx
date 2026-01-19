import React from 'react';

const App = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <header className="flex items-center">
        <img src="/src/assets/react.svg" alt="React Logo" className="h-20" />
        <h1 className="text-4xl font-bold ml-4">Welcome to My Vite React App</h1>
      </header>
      <main className="mt-10">
        <p className="text-lg">This is a simple application using Vite, React, and Tailwind CSS.</p>
      </main>
    </div>
  );
};

export default App;