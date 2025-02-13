import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, AccountAddress } from "@aptos-labs/ts-sdk";

export default function ModuleExplorer() {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<Network>(Network.DEVNET);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const validateAndFormatAddress = (addr: string): string | null => {
    try {
      if (!addr) {
        setError("Please enter a contract address");
        return null;
      }
      // Try to parse and format the address
      const parsedAddr = AccountAddress.from(addr);
      return parsedAddr.toString();
    } catch (err) {
      setError("Invalid address format");
      return null;
    }
  };

  const handleExplore = () => {
    const formattedAddress = validateAndFormatAddress(address);
    if (!formattedAddress) {
      return;
    }

    // Store network in localStorage for persistence
    localStorage.setItem("selectedNetwork", network);

    // Navigate with both address and network
    navigate(`/modules/${formattedAddress}/code`, {
      state: { network, address: formattedAddress },
    });
  };

  return (
    <div className="flex-1 w-full bg-base-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4">Module Explorer</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter a contract address to explore its modules and functions.
          </p>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Contract Address</span>
            </label>
            <input
              type="text"
              placeholder="0x..."
              className={`input input-bordered w-full ${error ? "input-error" : ""}`}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError("");
              }}
            />
            {error && (
              <label className="label">
                <span className="label-text-alt text-error">{error}</span>
              </label>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Network</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
            >
              <option value={Network.DEVNET}>Devnet</option>
              <option value={Network.TESTNET}>Testnet</option>
              <option value={Network.MAINNET}>Mainnet</option>
            </select>
          </div>
          <button className="btn btn-primary w-full" onClick={handleExplore}>
            Explore Module
          </button>
        </div>
      </div>
    </div>
  );
}
