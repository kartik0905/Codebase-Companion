import { useState } from "react";
import "./index.css";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleIndexRepository = async () => {
    if (!repoUrl) {
      alert("Please enter a GitHub URL.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Sending URL to server...");

    try {
      // THE FIX IS HERE: Use the full URL to your backend server
      const response = await fetch("http://localhost:3001/index-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });

      // This part is great! It checks for a bad response before trying to parse JSON.
      if (!response.ok) {
        // Try to get a specific error message from the backend's JSON response
        const errorData = await response.json().catch(() => ({
          error: "Server returned a non-JSON error.",
        }));
        throw new Error(
          errorData.error || "Something went wrong on the server."
        );
      }

      const data = await response.json();

      setStatusMessage(data.message);
    } catch (error) {
      console.error("Fetch error:", error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
          disabled={isLoading}
        />
        <button
          className="bg-cyan-500 hover:bg-cyan-600 font-bold p-3 rounded-r-md transition-colors disabled:opacity-50"
          onClick={handleIndexRepository}
          disabled={isLoading}
        >
          {isLoading ? "Indexing..." : "Index Repository"}
        </button>
      </div>

      {statusMessage && (
        <p className="mt-4 text-cyan-400 font-medium">{statusMessage}</p>
      )}
    </div>
  );
}

export default App;
