import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Contract from "./Contract";
import ViewCode from "./ViewCode";
import Packages from "./Packages";
import {
  Network,
  Aptos,
  AptosConfig,
  AccountAddress,
  MoveModuleBytecode,
} from "@aptos-labs/ts-sdk";

interface Props {
  contractAddress?: string;
  network?: Network;
}

export default function ModulesPage({
  contractAddress,
  network = Network.DEVNET,
}: Props) {
  const navigate = useNavigate();
  const { address, view, selectedModuleName } = useParams();
  const [modules, setModules] = useState<MoveModuleBytecode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("code");
  const [moduleSource, setModuleSource] = useState<string>("");

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        setError(null);

        const config = new AptosConfig({ network });
        const client = new Aptos(config);

        const addr = contractAddress || address;
        if (!addr) {
          throw new Error("No contract address provided");
        }

        const accountAddress = AccountAddress.from(addr);
        const modulesList = await client.getAccountModules({ accountAddress });
        setModules(modulesList);

        // If no module is selected and we have modules, select the first one
        if (
          !selectedModuleName &&
          modulesList.length > 0 &&
          modulesList[0].abi?.name
        ) {
          navigate(`/modules/${addr}/code/${modulesList[0].abi.name}`);
        }
      } catch (err) {
        console.error("Failed to fetch modules:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch modules",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [contractAddress, address, network, selectedModuleName, navigate]);

  const handleModuleChange = (moduleName: string) => {
    if (moduleName) {
      navigate(`/modules/${address}/code/${moduleName}`);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (selectedModuleName) {
      navigate(`/modules/${address}/${tab}/${selectedModuleName}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="alert alert-info">
        <span>No modules found for this address</span>
      </div>
    );
  }

  const renderTabContent = () => {
    if (!selectedModuleName) {
      return (
        <div className="alert alert-info">
          <span>Select a module to view its details</span>
        </div>
      );
    }

    switch (activeTab) {
      case "code":
        return (
          <ViewCode
            address={address || ""}
            network={network}
            moduleName={selectedModuleName}
            onSourceUpdate={setModuleSource}
          />
        );
      case "entry-functions":
        return (
          <Contract
            address={address || ""}
            network={network}
            isRead={false}
            moduleName={selectedModuleName}
            sourceCode={moduleSource}
          />
        );
      case "view-functions":
        return (
          <Contract
            address={address || ""}
            network={network}
            isRead={true}
            moduleName={selectedModuleName}
            sourceCode={moduleSource}
          />
        );
      case "resources":
        return (
          <Packages
            address={address || ""}
            network={network}
            moduleName={selectedModuleName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-none p-4">
        <h2 className="text-xl font-bold mb-4">Select Module</h2>
        {address && (
          <div className="flex items-center gap-2 mb-4">
            <div className="font-mono text-sm flex-1 bg-base-200 p-2 rounded overflow-x-auto">
              {address}
            </div>
            <button
              className="btn btn-square btn-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(address);
                // You could add a toast notification here
              }}
              title="Copy address"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>
        )}
        <select
          className="select select-bordered w-full max-w-xs"
          value={selectedModuleName || ""}
          onChange={(e) => handleModuleChange(e.target.value)}
        >
          <option value="">Select a module</option>
          {modules.map((module) => (
            <option key={module.abi?.name} value={module.abi?.name}>
              {module.abi?.name}
            </option>
          ))}
        </select>
      </div>

      {selectedModuleName && (
        <div className="flex-1 p-4 overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">{selectedModuleName}</h3>
          </div>

          <div className="nav-tabs mb-4">
            <button
              className={`nav-tab ${activeTab === "code" ? "active" : ""}`}
              onClick={() => handleTabChange("code")}
            >
              Source Code
            </button>
            <button
              className={`nav-tab ${activeTab === "entry-functions" ? "active" : ""}`}
              onClick={() => handleTabChange("entry-functions")}
            >
              Entry Functions
            </button>
            <button
              className={`nav-tab ${activeTab === "view-functions" ? "active" : ""}`}
              onClick={() => handleTabChange("view-functions")}
            >
              View Functions
            </button>
            <button
              className={`nav-tab ${activeTab === "resources" ? "active" : ""}`}
              onClick={() => handleTabChange("resources")}
            >
              Resources
            </button>
          </div>

          {/* Tab content */}
          <div className="bg-base-200 rounded-lg p-4 overflow-auto">
            {renderTabContent()}
          </div>
        </div>
      )}
    </div>
  );
}
