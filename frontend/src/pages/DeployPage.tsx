import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ContractDeployment from '../components/ContractDeployment';

interface DeploymentResult {
  address: string;
  network: string;
}

export default function DeployPage() {
  const [code, setCode] = useState('');
  const [showDeployment, setShowDeployment] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);

  const handleDeploy = (address: string, network: string) => {
    setShowDeployment(false);
    setDeploymentResult({ address, network });
  };

  useEffect(() => {
    // Load initial code
    fetch('/api/code/contract.move')
      .then(res => res.text())
      .then(setCode)
      .catch(console.error);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Smart Contract Deployment</h1>
        <button
          onClick={() => setShowDeployment(true)}
          className="btn btn-primary"
        >
          Deploy Contract
        </button>
      </div>

      {deploymentResult && (
        <div className="alert alert-success shadow-lg mb-4">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Deployment Successful!</h3>
              <div className="text-sm">
                Contract deployed at: <a 
                  href={`https://explorer.aptoslabs.com/account/${deploymentResult.address}?network=${deploymentResult.network}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {deploymentResult.address}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-base-200 rounded-lg overflow-hidden">
        <Editor
          height="70vh"
          defaultLanguage="move"
          value={code}
          onChange={value => setCode(value || '')}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            wordWrap: 'on'
          }}
          theme="vs-dark"
        />
      </div>

      {showDeployment && (
        <ContractDeployment
          onDeploy={handleDeploy}
          onCancel={() => setShowDeployment(false)}
          currentCode={code}
          packageName="are_you_learning"
        />
      )}
    </div>
  );
} 