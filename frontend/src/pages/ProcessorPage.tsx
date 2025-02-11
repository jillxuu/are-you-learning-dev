import { useState, useEffect } from 'react';
import { Network } from '@aptos-labs/ts-sdk';
import { createPlatformAdminApiClient } from "@aptos-internal/aptos-shepherd-platform-client";
import { SHEPHERD_API_URL, getHeaders } from '../config';
import type { 
  GetSpecs, 
  InstanceStatus,
  GetInstanceResponse,
  SpecIdentifierArgs,
  CommonInstanceConfig,
  InstanceAndSpec,
  DbStatus,
  ProcessorStatus,
  ApiStatus,
  RouteStatus,
  OverallStatus
} from '@aptos-internal/aptos-shepherd-platform-client';
import EventSelection from '../components/EventSelection';
import RemappingConfiguration from '../components/RemappingConfiguration';

// Configuration store to manage state across tabs
interface ConfigState {
  basic: CommonInstanceConfig | null;
  events: string[];
  remapping: any; // We'll type this properly later
}

const ProcessorPage = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [selectedSpec, setSelectedSpec] = useState<GetSpecs | null>(null);
  const [specs, setSpecs] = useState<GetSpecs[]>([]);
  const [processorStatus, setProcessorStatus] = useState<InstanceStatus | null>(null);
  const [processorInstance, setProcessorInstance] = useState<InstanceAndSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('spec');
  const [configState, setConfigState] = useState<ConfigState>({
    basic: null,
    events: [],
    remapping: null
  });

  // Initialize API client
  const shepherdApiClient = createPlatformAdminApiClient({
    apiUrl: SHEPHERD_API_URL,
    customFetch: async (input: RequestInfo | URL, init: RequestInit | undefined) => {
      const fetchHeaders = new Headers(init?.headers);
      const headers = getHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        fetchHeaders.append(key, value);
      });
      const response = await fetch(input, { ...init, headers: fetchHeaders });
      return response;
    }
  });

  // Initialize basic config with default values
  useEffect(() => {
    if (!configState.basic) {
      setConfigState(prev => ({
        ...prev,
        basic: {
          network: 'devnet',
          starting_version: 0,
          starting_version_override: null,
          max_write_per_five_minutes_bytes: 1000000,
          max_db_size_bytes: 1000000000
        }
      }));
    }
  }, []);

  // Fetch available processor specs
  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const data = await shepherdApiClient.query(["getSpecs", null]);
        setSpecs(data);
      } catch (err) {
        console.error('Failed to fetch processor specs:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to fetch processor specs');
        }
      }
    };

    fetchSpecs();
  }, []);

  const createProcessor = async () => {
    if (!selectedSpec || !contractAddress || !configState.basic || !configState.remapping) {
      setError('Please complete all configuration steps');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const specIdentifier: SpecIdentifierArgs = {
        spec_creator: selectedSpec.creator_email,
        spec_name: selectedSpec.name,
        spec_version: selectedSpec.version
      };

      const result = await shepherdApiClient.mutation(["createInstance", {
        spec_identifier: specIdentifier,
        common_config: configState.basic,
        custom_config: {
          ...configState.remapping,
          contract_address: contractAddress
        }
      }]);
      
      // Start polling for status
      if (result) {
        pollProcessorStatus(result);
      } else {
        throw new Error('Invalid response from createInstance');
      }
    } catch (err) {
      console.error('Failed to create processor:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create processor');
      }
    } finally {
      setLoading(false);
    }
  };

  const pollProcessorStatus = async (instanceId: string) => {
    const checkStatus = async () => {
      try {
        const response = await shepherdApiClient.query(["getInstance"]);
        setProcessorInstance(response.instance);
        setProcessorStatus(response.status);
        return response.status.overall_status === 'Provisioning';
      } catch (err) {
        console.error('Error polling status:', err);
        return true;
      }
    };

    const poll = async () => {
      const isDone = await checkStatus();
      if (!isDone) {
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const getStatusDisplay = (status: any) => {
    if (!status) return 'Unknown';
    if (typeof status === 'string') return status;
    if (typeof status === 'object') {
      // Handle variant types
      const variant = Object.keys(status)[0];
      return variant;
    }
    return 'Unknown';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'spec':
        return (
          <div className="form-control w-full mb-4 flex items-center">
            <div className="w-full max-w-md">
              <label className="label">
                <span className="label-text">Select Processor Spec</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedSpec?.id.toString() || ''}
                onChange={(e) => {
                  const spec = specs.find(s => s.id.toString() === e.target.value);
                  setSelectedSpec(spec || null);
                }}
              >
                <option value="">Select a spec</option>
                {specs.map(spec => (
                  <option key={spec.id} value={spec.id.toString()}>
                    {spec.name}
                  </option>
                ))}
              </select>
              {selectedSpec && (
                <div className="mt-4 text-center">
                  <h3 className="font-semibold">Selected Spec Details:</h3>
                  <p>{selectedSpec.description}</p>
                  <button 
                    className="btn btn-primary mt-4"
                    onClick={() => setActiveTab('basic')}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 'basic':
        return (
          <div className="form-control w-full mb-4 flex items-center">
            <div className="w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-center">Basic Configuration</h2>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Contract Address</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter contract address"
                  className="input input-bordered w-full"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Network</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={configState.basic?.network || 'devnet'}
                  onChange={(e) => {
                    const network = e.target.value;
                    setConfigState(prev => ({
                      ...prev,
                      basic: {
                        network,
                        starting_version: 0,
                        starting_version_override: null,
                        max_write_per_five_minutes_bytes: 1000000,
                        max_db_size_bytes: 1000000000
                      }
                    }));
                  }}
                >
                  <option value="devnet">Devnet</option>
                  <option value="testnet">Testnet</option>
                  <option value="mainnet">Mainnet</option>
                </select>
              </div>
              <div className="flex justify-between">
                <button 
                  className="btn"
                  onClick={() => setActiveTab('spec')}
                >
                  Back
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('events')}
                  disabled={!contractAddress}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        );
      case 'events':
        return (
          <div className="w-full h-[calc(100vh-16rem)]">
            <EventSelection
              contractAddress={contractAddress}
              onEventsSelected={(events) => {
                setConfigState(prev => ({
                  ...prev,
                  events
                }));
              }}
              onBack={() => setActiveTab('basic')}
              onNext={() => setActiveTab('remapping')}
            />
          </div>
        );
      case 'remapping':
        return (
          <div className="w-full h-[calc(100vh-16rem)]">
            <RemappingConfiguration
              selectedEvents={configState.events}
              onConfigurationComplete={(config) => {
                setConfigState(prev => ({
                  ...prev,
                  remapping: config
                }));
              }}
              onBack={() => setActiveTab('events')}
              onNext={() => setActiveTab('review')}
              contractAddress={contractAddress}
            />
          </div>
        );
      case 'review':
        return (
          <div className="w-full h-[calc(100vh-16rem)] overflow-y-auto">
            <div className="container mx-auto max-w-3xl p-4">
              <h2 className="text-xl font-bold mb-4 text-center">Review Configuration</h2>
              <div className="mb-4 text-sm opacity-50">
                <p>Debug Info:</p>
                <pre className="bg-base-300 p-2 rounded">
                  {JSON.stringify({
                    hasSpec: !!selectedSpec,
                    hasAddress: !!contractAddress,
                    hasBasicConfig: !!configState.basic,
                    hasRemapping: !!configState.remapping,
                    isLoading: loading
                  }, null, 2)}
                </pre>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Basic Configuration:</h3>
                  <div className="bg-base-200 p-4 rounded-lg">
                    <p><span className="font-semibold">Contract Address:</span></p>
                    <p className="font-mono text-sm break-all">{contractAddress}</p>
                    <p className="mt-2"><span className="font-semibold">Network:</span> {configState.basic?.network}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Selected Events:</h3>
                  <div className="bg-base-200 p-4 rounded-lg">
                    <ul className="space-y-2">
                      {configState.events.map((event, index) => (
                        <li key={index} className="font-mono text-sm">{event}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Remapping Configuration:</h3>
                  <div className="bg-base-200 p-4 rounded-lg">
                    <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                      {JSON.stringify(configState.remapping, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button 
                    className="btn"
                    onClick={() => setActiveTab('remapping')}
                  >
                    Back
                  </button>
                  <button
                    className={`btn btn-primary ${loading ? 'loading' : ''}`}
                    onClick={createProcessor}
                    disabled={loading || !selectedSpec || !contractAddress || !configState.basic || !configState.remapping}
                  >
                    {loading ? 'Creating...' : 'Create Processor'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col flex-1 bg-base-100">
        <div className="flex-none p-6">
          <h1 className="text-2xl font-bold mb-4 text-center">Create Processor</h1>
          
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <div className="tabs tabs-boxed justify-center mb-4">
            <a 
              className={`tab ${activeTab === 'spec' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('spec')}
            >
              Select Spec
            </a>
            <a 
              className={`tab ${activeTab === 'basic' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic Config
            </a>
            <a 
              className={`tab ${activeTab === 'events' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events
            </a>
            <a 
              className={`tab ${activeTab === 'remapping' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('remapping')}
            >
              Remapping
            </a>
            <a 
              className={`tab ${activeTab === 'review' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              Review
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {renderTabContent()}
        </div>

        {processorStatus && (
          <div className="flex-none p-6 border-t">
            <div className="w-full max-w-4xl mx-auto">
              <h3 className="font-semibold mb-2 text-center">Processor Status:</h3>
              <div className="stats shadow w-full">
                <div className="stat">
                  <div className="stat-title">Status</div>
                  <div className="stat-value">{getStatusDisplay(processorStatus.overall_status)}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Database</div>
                  <div className="stat-value">{getStatusDisplay(processorStatus.db_status)}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Processor</div>
                  <div className="stat-value">{getStatusDisplay(processorStatus.processor_status)}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">API</div>
                  <div className="stat-value">{getStatusDisplay(processorStatus.api_status)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessorPage; 