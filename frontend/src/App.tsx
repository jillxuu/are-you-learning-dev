import { useState, useEffect, useMemo } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Ed25519Account,
  Ed25519PrivateKey,
  Network,
  AccountAddress,
} from "@aptos-labs/ts-sdk";
import CodeLearningView from "./components/CodeLearningView";
import CodePlaygroundView from "./components/CodePlaygroundView";
import ContractDeployment from "./components/ContractDeployment";
import ModulesPage from "./pages/Modules";
import ModuleExplorer from "./pages/ModuleExplorer";
import WorkshopsPage from "./features/workshops/pages/WorkshopsPage";

const THEMES = [
  { name: "synthwave", label: "Synthwave" },
  { name: "cyberpunk", label: "Cyberpunk" },
  { name: "dracula", label: "Dracula" },
  { name: "forest", label: "Forest" },
  { name: "luxury", label: "Luxury" },
  { name: "night", label: "Night" },
  { name: "business", label: "Business" },
  { name: "corporate", label: "Corporate" },
];

function App() {
  const [theme, setTheme] = useState("synthwave");
  const [packageName, setPackageName] = useState("meme_factory"); // TODO: make this configurable
  const [moduleName, setModuleName] = useState("meme_coin"); // TODO: make this configurable
  const [code, setCode] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [cleanCode, setCleanCode] = useState("");
  const [showDeployment, setShowDeployment] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [deployedContract, setDeployedContract] = useState<{
    address: string;
    network: Network;
  } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [tempPrivateKey, setTempPrivateKey] = useState("");

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleReset = () => {
    setCode(originalCode);
  };

  const handleCheckCode = async () => {
    if (!privateKey) {
      setShowPrivateKeyModal(true);
      return;
    }

    try {
      const accountAddress = useMemo(() => {
        const account = new Ed25519Account({
          privateKey: new Ed25519PrivateKey(privateKey),
        });
        return account.accountAddress.toString();
      }, [privateKey]);

      // First compile
      const compileResponse = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageName,
          address: accountAddress,
        }),
      });

      const compileResult = await compileResponse.json();

      if (!compileResponse.ok || compileResult.error) {
        throw new Error(compileResult.error || "Compilation failed");
      }

      // Show deployment modal
      setShowDeployment(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Operation failed. Please try again.");
    }
  };

  const handlePrivateKeySubmit = () => {
    setPrivateKey(tempPrivateKey);
    setTempPrivateKey("");
    setShowPrivateKeyModal(false);
    // Call handleCheckCode again now that we have the private key
    handleCheckCode();
  };

  const handleDeploy = async (address: string, networkStr: Network) => {
    setShowDeployment(false);
    setPrivateKey(null);
    const formattedAddress = AccountAddress.from(address).toString();
    setDeployedContract({ address: formattedAddress, network: networkStr });
    // Navigate to modules page after successful deployment
    navigate(`/modules/${formattedAddress}/code`, {
      state: { network: networkStr, address: formattedAddress },
    });
  };

  return (
    <div className="h-screen flex flex-col bg-base-100" data-theme={theme}>
      {/* Navigation Bar */}
      <div className="navbar bg-base-200">
        <div className="navbar-start">
          <a
            className="btn btn-ghost text-xl font-title"
            onClick={() => navigate("/")}
          >
            AreYouLearning
          </a>
        </div>
        <div className="navbar-center">
          <a className="btn btn-ghost" onClick={() => navigate("/workshops")}>
            Move Workshops
          </a>
          <a className="btn btn-ghost" onClick={() => navigate("/learn")}>
            Move Reading
          </a>
          <a className="btn btn-ghost" onClick={() => navigate("/playground")}>
            Move Playing
          </a>
          <a className="btn btn-ghost" onClick={() => navigate("/explorer")}>
            Contract Exploring
          </a>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost m-1">
              Theme
              <svg
                width="12px"
                height="12px"
                className="h-2 w-2 fill-current opacity-60 inline-block"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 2048 2048"
              >
                <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] p-2 shadow-2xl bg-base-300 rounded-box w-52"
            >
              {THEMES.map((t) => (
                <li key={t.name}>
                  <input
                    type="radio"
                    name="theme-dropdown"
                    className="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                    aria-label={t.label}
                    value={t.name}
                    checked={theme === t.name}
                    onChange={(e) => setTheme(e.target.value)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Navigate to="/workshops" replace />} />
          <Route path="/workshops" element={<WorkshopsPage />} />
          <Route path="/workshops/:workshopId" element={<WorkshopsPage />} />
          <Route
            path="/workshops/:workshopId/edit"
            element={<WorkshopsPage />}
          />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/explorer" element={<ModuleExplorer />} />
          <Route
            path="/learn"
            element={
              <CodeLearningView
                code={cleanCode}
                onContinue={() => navigate("/playground")}
              />
            }
          />
          <Route
            path="/playground"
            element={
              <>
                <CodePlaygroundView
                  code={code}
                  onCodeChange={handleCodeChange}
                  onCheckCode={handleCheckCode}
                  onReset={handleReset}
                />
                {showDeployment && privateKey && (
                  <ContractDeployment
                    onDeploy={handleDeploy}
                    packageName={packageName}
                    onCancel={() => {
                      setShowDeployment(false);
                      setPrivateKey(null);
                    }}
                    currentCode={code}
                    privateKey={privateKey}
                  />
                )}
              </>
            }
          />
          <Route
            path="/modules/:address/:view/:selectedModuleName?"
            element={
              <ModulesPage
                contractAddress={
                  location.state?.address || deployedContract?.address || ""
                }
                network={
                  location.state?.network ||
                  deployedContract?.network ||
                  Network.DEVNET
                }
              />
            }
          />
        </Routes>
      </div>

      {/* Private Key Modal */}
      {showPrivateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-base-100 opacity-90 backdrop-blur-sm"></div>
          <div className="relative z-10 bg-base-200 p-6 rounded-lg shadow-xl w-96">
            <h3 className="font-bold text-lg mb-2">Enter Private Key</h3>
            <p className="py-4 opacity-90">
              Please enter your private key for compilation:
            </p>
            <div className="form-control">
              <input
                type="password"
                placeholder="Enter private key"
                className="input input-bordered w-full bg-base-100/80"
                value={tempPrivateKey}
                onChange={(e) => setTempPrivateKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tempPrivateKey) {
                    handlePrivateKeySubmit();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowPrivateKeyModal(false);
                  setTempPrivateKey("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePrivateKeySubmit}
                disabled={!tempPrivateKey}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
