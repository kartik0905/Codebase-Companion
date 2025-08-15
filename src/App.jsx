import { useState, useRef, useEffect } from "react";

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [repoIndexed, setRepoIndexed] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleIndexRepository = async (e) => {
    e.preventDefault();
    if (!repositoryUrl) {
      alert("Please enter a repository URL.");
      return;
    }

    setIsIndexing(true);
    setRepoIndexed(false);
    setConversation([]); 

    try {
      const response = await fetch("http://127.0.0.1:3001/index-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: repositoryUrl }),
      });

      const data = await response.json();

      if (response.status === 202) {
        setRepoIndexed(true);
        setConversation([
          {
            sender: "ai",
            text: `I've started indexing the repository. You can now ask me questions about it while I process it in the background.`,
          },
        ]);
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

 
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!currentQuestion || isAsking) return;

    const questionToSend = currentQuestion;

    const newConversation = [
      ...conversation,
      { sender: "user", text: questionToSend },
    ];
    setConversation(newConversation);
    setCurrentQuestion("");
    setIsAsking(true);

    try {
      const response = await fetch("http://127.0.0.1:3001/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionToSend }),
      });

      const data = await response.json();

     
      if (!response.ok) {
        throw new Error(data.details || "The server returned an error.");
      }

      setConversation([
        ...newConversation,
        { sender: "ai", text: data.answer },
      ]);
    } catch (error) {
      console.error("Ask error:", error);
      setConversation([
        ...newConversation,
        { sender: "ai", text: `Sorry, I ran into an error: ${error.message}` },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl flex flex-col h-[80vh]">
        <h1 className="text-4xl font-bold mb-4 text-center">
          Codebase Companion 🤖
        </h1>

        {!repoIndexed ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl mb-4">
              Enter a public GitHub repository URL to start
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
        ) : (
          <>
            <div className="flex-grow bg-gray-800 p-4 rounded-t-lg shadow-inner overflow-y-auto">
              <div className="space-y-4">
                {conversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-prose p-3 rounded-lg ${
                        msg.sender === "user" ? "bg-blue-600" : "bg-gray-700"
                      }`}
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-b-lg shadow-lg">
              <form onSubmit={handleAskQuestion} className="flex">
                <input
                  type="text"
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="Ask a question about the codebase..."
                  className="flex-grow p-2 bg-gray-700 rounded-l border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAsking}
                />
                <button
                  type="submit"
                  disabled={isAsking}
                  className="bg-blue-600 hover:bg-blue-700 p-2 rounded-r disabled:bg-gray-500"
                >
                  Ask
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
