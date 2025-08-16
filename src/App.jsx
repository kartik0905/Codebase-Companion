// src/App.jsx
import { useState, useEffect } from "react";
import { Chat } from "./Chat"; // <-- Import the new Chat component

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [repoList, setRepoList] = useState([]);
  const [view, setView] = useState("home"); // 'home' or 'chat'

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch(
          "https://codebase-companion-backend.onrender.com/api/repositories"
        );
        const data = await response.json();
        if (data.success) {
          setRepoList(data.repositories);
        }
      } catch (error) {
        console.error("Failed to fetch repositories:", error);
      }
    };
    fetchRepos();
  }, [view]);

  const handleStartNew = () => {
    setView("home");
    setRepoId("");
    setRepositoryUrl("");
  };

  const handleSelectRepo = (selectedRepoId) => {
    setRepoId(selectedRepoId);
    setView("chat");
  };

  const handleIndexRepository = async (e) => {
    e.preventDefault();
    if (!repositoryUrl) return alert("Please enter a repository URL.");
    setIsIndexing(true);
    try {
      const response = await fetch(
        "https://codebase-companion-backend.onrender.com/index-repo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: repositoryUrl }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setRepoId(data.repoId);
        setView("chat");
      } else {
        throw new Error(data.error || "Failed to start indexing.");
      }
    } catch (error) {
      console.error("Indexing error:", error);
      alert(`Error starting indexing: ${error.message}`);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex font-sans p-4">
      <div className="w-1/4 bg-gray-800 rounded-lg p-4 mr-4">
        <h2 className="text-xl font-bold mb-4">Indexed Repositories</h2>
        <ul className="space-y-2">
          {repoList.map((repo) => (
            <li key={repo}>
              <button
                onClick={() => handleSelectRepo(repo)}
                className={`w-full text-left px-2 py-1 rounded ${
                  repo === repoId
                    ? "bg-blue-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {repo}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-3/4 flex flex-col h-[90vh]">
        {view === "chat" ? (
          <Chat repoId={repoId} handleStartNew={handleStartNew} />
        ) : (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-4">
              <h1 className="text-4xl font-bold">Codebase Companion 🤖</h1>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl mb-4 text-center">
                Select a repository or index a new one.
              </h2>
              <form onSubmit={handleIndexRepository}>
                <input
                  type="text"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full p-2 mb-4 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isIndexing}
                  className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded disabled:bg-gray-500"
                >
                  {isIndexing ? "Indexing..." : "Index Repository"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
