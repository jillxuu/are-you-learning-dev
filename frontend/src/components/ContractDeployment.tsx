import React, { useState } from "react";

interface Props {
  onDeploy: (address: string, network: string) => void;
  onCancel: () => void;
  currentCode: string;
  packageName: string;
  privateKey: string;
}

interface DeploymentStatus {
  isCompiling: boolean;
  isDeploying: boolean;
  error?: string;
  address?: string;
}

export default function ContractDeployment({
  onDeploy,
  onCancel,
  currentCode,
  packageName,
  privateKey,
}: Props) {
  const [status, setStatus] = useState<DeploymentStatus>({
    isCompiling: false,
    isDeploying: false,
  });
  const [nodeUrl, setNodeUrl] = useState(
    process.env.VITE_APTOS_NODE_URL || "https://fullnode.devnet.aptoslabs.com",
  );

  const handleDeploy = async () => {
    try {
      // Deploy
      setStatus((prev) => ({ ...prev, isDeploying: true }));
      const deployResponse = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateKey,
          nodeUrl,
          packageName,
        }),
      });

      const deployResult = await deployResponse.json();
      if (!deployResult.success) {
        setStatus((prev) => ({
          ...prev,
          isDeploying: false,
          error: `Deployment failed: ${deployResult.error}`,
        }));
        return;
      }

      setStatus({
        isCompiling: false,
        isDeploying: false,
        address: deployResult.address,
      });

      // Get network name from URL
      const network = nodeUrl.includes("devnet")
        ? "devnet"
        : nodeUrl.includes("testnet")
          ? "testnet"
          : "mainnet";

      onDeploy(deployResult.address, network);
    } catch (error) {
      setStatus({
        isCompiling: false,
        isDeploying: false,
        error: `Deployment error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-base-200 rounded-lg p-6 max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-4">Deploy Contract</h2>

        {/* Network Selection */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Network URL</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
          >
            <option value="https://fullnode.devnet.aptoslabs.com">
              Devnet
            </option>
            <option value="https://fullnode.testnet.aptoslabs.com">
              Testnet
            </option>
            <option value="https://fullnode.mainnet.aptoslabs.com">
              Mainnet
            </option>
          </select>
        </div>

        {/* Status and Error Display */}
        {status.error && (
          <div className="alert alert-error mb-4">
            <span>{status.error}</span>
          </div>
        )}

        {status.address && (
          <div className="alert alert-success mb-4">
            <span>Contract deployed at: {status.address}</span>
          </div>
        )}

        {/* Loading States */}
        {status.isDeploying && (
          <div className="alert alert-info mb-4">
            <span>Deploying contract...</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={status.isDeploying}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDeploy}
            disabled={status.isDeploying}
          >
            {status.isDeploying ? "Deploying..." : "Deploy"}
          </button>
        </div>
      </div>
    </div>
  );
}
