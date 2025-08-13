
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

// src/App.jsx

// src/App.jsx

import { useState } from 'react';
import './index.css';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleIndexRepository = () => {
    if (!repoUrl) {
      alert('Please enter a GitHub URL.');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Indexing in progress...');
    
    // Simulate backend work - we'll replace this with a real API call soon
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage('Indexing complete!');
    }, 2000); 

    console.log('Indexing repository:', repoUrl);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center pt-20">
      <div className="text-center">
        <h1 className="text-5xl font-bold">Codebase Companion 🤖</h1>
        <p className="text-gray-400 mt-4">
          Enter a public GitHub repository URL to start the conversation.
        </p>
      </div>
      
      <div className="w-full max-w-2xl mt-10 flex">
        <input
          type="url"
          placeholder="https://github.com/user/repo.git"
          className="flex-grow p-3 bg-gray-800 text-gray-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-gray-700"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={isLoading} // <-- NEW
        />
        <button 
          className="bg-cyan-500 hover:bg-cyan-600 font-bold p-3 rounded-r-md transition-colors disabled:opacity-50" // <-- NEW
          onClick={handleIndexRepository}
          disabled={isLoading} // <-- NEW
        >
          {isLoading ? 'Indexing...' : 'Index Repository'} {/* <-- NEW */}
        </button>
      </div>

      {statusMessage && ( // <-- NEW
        <p className="mt-4 text-cyan-400 font-medium">
          {statusMessage}
        </p>
      )}
    </div>
  );
}

export default App;