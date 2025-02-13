import React, { useState, useEffect } from "react";
import { Network, AptosConfig } from "@aptos-labs/ts-sdk";
import { useContract } from "../hooks/useContract";

interface Props {
  contractAddress?: string;
  network?: Network;
}

interface FunctionInfo {
  name: string;
  visibility: string;
  isEntry: boolean;
  genericTypeParams: any[];
  params: string[];
  return: string[];
}

interface ModuleFunction {
  name: string;
  visibility: string;
  is_entry: boolean;
  generic_type_params: any[];
  params: string[];
  return: string[];
}

interface ModuleInfo {
  abi?: {
    name: string;
    exposed_functions: ModuleFunction[];
  };
}

export default function ContractExplorer({
  contractAddress: initialAddress,
  network = Network.DEVNET,
}: Props) {
  const [address, setAddress] = useState(initialAddress || "");
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [functionParams, setFunctionParams] = useState<string[]>([]);
  const [result, setResult] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [functions, setFunctions] = useState<{ [key: string]: FunctionInfo }>(
    {},
  );
  const [moduleName, setModuleName] = useState("meme_coin");
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);

  const { loading, error, callViewFunction, callFunction, getModule } =
    useContract({
      network,
      address,
      moduleName,
    });

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
    }
  }, [initialAddress]);

  // Fetch module info when address changes
  useEffect(() => {
    if (address) {
      loadModuleInfo();
    }
  }, [address, moduleName]);

  const loadModuleInfo = async () => {
    try {
      const moduleInfo = await getModule();
      setModuleInfo(moduleInfo);
      if (moduleInfo.abi) {
        // Extract functions from module ABI
        const exposedFunctions = moduleInfo.abi.exposed_functions.reduce(
          (acc: { [key: string]: FunctionInfo }, func: ModuleFunction) => {
            acc[func.name] = {
              name: func.name,
              visibility: func.visibility,
              isEntry: func.is_entry,
              genericTypeParams: func.generic_type_params,
              params: func.params,
              return: func.return,
            };
            return acc;
          },
          {},
        );
        setFunctions(exposedFunctions);
      }
    } catch (err) {
      console.error("Failed to load module info:", err);
    }
  };

  const handleFunctionSelect = (funcName: string) => {
    setSelectedFunction(funcName);
    setFunctionParams([]);
    setResult("");

    const func = functions[funcName];
    if (func) {
      // Skip signer parameter for entry functions
      const paramCount = func.isEntry
        ? func.params.length - 1
        : func.params.length;
      setFunctionParams(new Array(paramCount).fill(""));
    }
  };

  const handleParamChange = (index: number, value: string) => {
    const newParams = [...functionParams];
    newParams[index] = value;
    setFunctionParams(newParams);
  };

  const executeFunction = async () => {
    if (!selectedFunction) return;

    try {
      const func = functions[selectedFunction];
      if (!func) return;

      let response;
      if (func.isEntry) {
        if (!privateKey) {
          throw new Error("Private key is required for entry functions");
        }
        response = await callFunction(
          selectedFunction,
          privateKey,
          functionParams,
        );
      } else {
        response = await callViewFunction(selectedFunction, functionParams);
      }
      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      console.error("Function execution error:", err);
      setResult(
        JSON.stringify(
          { error: err instanceof Error ? err.message : "Unknown error" },
          null,
          2,
        ),
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Contract Explorer</h2>

          {/* Contract Address Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Contract Address</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          {/* Module Name Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Module Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="Enter module name..."
            />
          </div>

          {/* Function Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select Function</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedFunction}
              onChange={(e) => handleFunctionSelect(e.target.value)}
            >
              <option value="">Select a function</option>
              <optgroup label="View Functions">
                {Object.entries(functions)
                  .filter(([_, func]) => !func.isEntry)
                  .map(([name, func]) => (
                    <option key={name} value={name}>
                      {name} ({func.params.join(", ")}) →{" "}
                      {func.return.join(", ")}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Entry Functions">
                {Object.entries(functions)
                  .filter(([_, func]) => func.isEntry)
                  .map(([name, func]) => (
                    <option key={name} value={name}>
                      {name} ({func.params.slice(1).join(", ")})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Private Key Input (for entry functions) */}
          {selectedFunction && functions[selectedFunction]?.isEntry && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Private Key (required for entry functions)
                </span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter private key..."
              />
            </div>
          )}

          {/* Function Parameters */}
          {selectedFunction && functions[selectedFunction] && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Parameters</h3>
              {functions[selectedFunction].params
                .slice(functions[selectedFunction].isEntry ? 1 : 0)
                .map((param, index) => (
                  <div key={index} className="form-control">
                    <label className="label">
                      <span className="label-text">
                        Parameter {index + 1}: {param}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={functionParams[index] || ""}
                      onChange={(e) => handleParamChange(index, e.target.value)}
                      placeholder={`Enter ${param}...`}
                    />
                  </div>
                ))}

              <button
                className={`btn btn-primary w-full ${loading ? "loading" : ""}`}
                onClick={executeFunction}
                disabled={loading}
              >
                {loading ? "Executing..." : "Execute Function"}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="alert alert-error">
              <span>{error.message}</span>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Result</h3>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
