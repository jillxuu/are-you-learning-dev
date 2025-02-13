import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Network } from "@aptos-labs/ts-sdk";
import { useContract } from "../../hooks/useContract";
import { Code } from "./CodeSnippet";

interface Props {
  address: string;
  network: Network;
  isRead: boolean;
  moduleName: string;
  sourceCode: string;
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
  is_view: boolean;
  generic_type_params: any[];
  params: string[];
  return: string[];
}

interface ModuleInfo {
  abi?: {
    name: string;
    exposed_functions: ModuleFunction[];
  };
  bytecode?: string;
}

export default function Contract({
  address,
  network,
  isRead,
  moduleName,
  sourceCode,
}: Props) {
  const { selectedModuleName, selectedFnName } = useParams();
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [functionParams, setFunctionParams] = useState<string[]>([]);
  const [result, setResult] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [functions, setFunctions] = useState<{ [key: string]: FunctionInfo }>(
    {},
  );
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { callViewFunction, callFunction, getModule } = useContract({
    network,
    address,
    moduleName: selectedModuleName || "",
  });

  useEffect(() => {
    if (selectedModuleName) {
      loadModuleInfo();
    }
  }, [selectedModuleName, address]);

  useEffect(() => {
    if (selectedFnName) {
      setSelectedFunction(selectedFnName);
    }
  }, [selectedFnName]);

  const loadModuleInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get module info
      const moduleInfo = await getModule();
      setModuleInfo(moduleInfo);
      if (moduleInfo.abi) {
        // Extract functions from module ABI
        const exposedFunctions = moduleInfo.abi.exposed_functions
          .filter((fn: ModuleFunction) => {
            // For view functions tab, show only view functions
            if (isRead) {
              return fn.is_view;
            }
            // For entry functions tab, show only entry functions
            return fn.is_entry;
          })
          .reduce(
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
      setError(
        err instanceof Error ? err.message : "Failed to load module info",
      );
    } finally {
      setLoading(false);
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

  if (!moduleInfo) {
    return (
      <div className="alert alert-info">
        <span>Select a module to view its functions</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full overflow-auto">
      <div className="col-span-6 overflow-auto">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body overflow-auto">
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
                {Object.entries(functions).map(([name, func]) => (
                  <option key={name} value={name}>
                    {name} ({func.params.slice(func.isEntry ? 1 : 0).join(", ")}
                    ){!func.isEntry && ` → ${func.return.join(", ")}`}
                  </option>
                ))}
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
                        onChange={(e) =>
                          handleParamChange(index, e.target.value)
                        }
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

      {/* Source Code Display */}
      <div className="col-span-6 overflow-auto">
        <div className="card bg-base-200 shadow-xl h-full">
          <div className="card-body p-0">
            <Code bytecode={sourceCode} />
          </div>
        </div>
      </div>
    </div>
  );
}
