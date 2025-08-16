import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";


const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const codeText = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000); 
  };

  return !inline && match ? (
    <div className="relative">
      <SyntaxHighlighter
        style={atomDark}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {codeText}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-sans px-2 py-1 rounded"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [repoIndexed, setRepoIndexed] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [conversation, setConversation] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

 
  const handleStartNew = () => {
    setRepoIndexed(false);
    setRepoId("");
    setRepositoryUrl("");
    setConversation([]);
    setCurrentQuestion("");
  };

  const handleIndexRepository = async (e) => {
    e.preventDefault();
    if (!repositoryUrl) {
      alert("Please enter a repository URL.");
      return;
    }
    setIsIndexing(true);
    setConversation([]);

    try {
      const response = await fetch("http://127.0.0.1:3001/index-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repositoryUrl }),
      });

      const data = await response.json();
      if (response.ok) {
        setRepoIndexed(true);
        setRepoId(data.repoId);
        const welcomeMessage =
          response.status === 202
            ? "I've started indexing the repository. You can ask questions while I process it."
            : "Repository is already indexed. Ready to answer your questions!";
        setConversation([{ sender: "ai", text: welcomeMessage }]);
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

    setConversation([
      ...newConversation,
      { sender: "ai", text: "", sources: [] },
    ]);
    setCurrentQuestion("");
    setIsAsking(true);

    try {
      const response = await fetch("http://127.0.0.1:3001/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionToSend, repoId: repoId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "The server returned an error.");
      }

      const sourcesHeader = response.headers.get("X-Source-Documents");
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value);
        setConversation((currentConversation) => {
          const lastMessageIndex = currentConversation.length - 1;
          const lastMessage = currentConversation[lastMessageIndex];
          const updatedLastMessage = {
            ...lastMessage,
            text: lastMessage.text + textChunk,
            sources: lastMessage.sources.length ? lastMessage.sources : sources,
          };
          return [
            ...currentConversation.slice(0, lastMessageIndex),
            updatedLastMessage,
          ];
        });
      }
    } catch (error) {
      console.error("Ask error:", error);
      setConversation((currentConversation) => {
        const lastMessageIndex = currentConversation.length - 1;
        const lastMessage = currentConversation[lastMessageIndex];
        const updatedLastMessage = {
          ...lastMessage,
          text: `Sorry, I ran into an error: ${error.message}`,
        };
        return [
          ...currentConversation.slice(0, lastMessageIndex),
          updatedLastMessage,
        ];
      });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl flex flex-col h-[80vh]">
       
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-center">
            Codebase Companion 🤖
          </h1>
          {repoIndexed && (
            <button
              onClick={handleStartNew}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-sans px-3 py-1 rounded"
            >
              Start New
            </button>
          )}
        </div>

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
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-prose p-3 rounded-lg ${
                        msg.sender === "user" ? "bg-blue-600" : "bg-gray-700"
                      }`}
                    >
                      {/* --- MODIFIED: Use ReactMarkdown with the custom CodeBlock component --- */}
                      {msg.sender === "user" ? (
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                      ) : (
                        <ReactMarkdown components={{ code: CodeBlock }}>
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>
                    {msg.sender === "ai" &&
                      msg.sources &&
                      msg.sources.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400 border border-gray-600 rounded p-2 max-w-prose">
                        
                          <h4 className="font-bold mb-1">Sources:</h4>
                          <ul className="space-y-1">
                            {msg.sources.map((source, idx) => (
                              <li key={idx} className="truncate">
                                -{" "}
                                {source
                                  .split("repos/")[1]
                                  ?.split("/")
                                  .slice(1)
                                  .join("/")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                {/* ... (form is unchanged) ... */}
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
