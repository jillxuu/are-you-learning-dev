import type { 
  GetSpecs, 
  InstanceStatus, 
  CreateInstanceArgs,
  GetInstanceResponse
} from '@aptos-internal/aptos-shepherd-platform-client';

// This is just for type inspection
const _typeCheck = () => {
  const createArgs: CreateInstanceArgs = {
    specId: 1,
    config: {
      contractAddress: '',
      network: 'devnet'
    }
  };

  const getInstance = {
    instanceId: ''
  };

  return { createArgs, getInstance };
}; 