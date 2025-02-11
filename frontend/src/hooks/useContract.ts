import { useState, useCallback } from 'react';
import { 
  Network, 
  Ed25519Account, 
  Ed25519PrivateKey, 
  AccountAddress, 
  SimpleTransaction,
  TransactionResponse
} from '@aptos-labs/ts-sdk';
import { getAptosClient } from '../api/client';
import { ContractModule, viewFunction, executeFunction, getModuleInfo, getModuleResources, getEvents } from '../api/contract';

interface UseContractOptions {
  network?: Network;
  address: string;
  moduleName?: string;
}

interface ContractError {
  message: string;
  details?: any;
}

export function useContract({ network = Network.DEVNET, address, moduleName = 'meme_coin' }: UseContractOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const module: ContractModule = {
    address,
    moduleName
  };

  const client = getAptosClient(network);

  const callViewFunction = useCallback(async (
    functionName: string,
    args: any[] = [],
    typeArgs: string[] = []
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await viewFunction(module, functionName, args, typeArgs, client);
      return result;
    } catch (err) {
      setError({
        message: 'Failed to call view function',
        details: err
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [module, client]);

  const callFunction = useCallback(async (
    functionName: string,
    privateKey: string,
    args: any[] = [],
    typeArgs: string[] = []
  ): Promise<TransactionResponse> => {
    setLoading(true);
    setError(null);
    try {
      const account = new Ed25519Account({
        privateKey: new Ed25519PrivateKey(privateKey)
      });

      // Build the transaction
      const transaction = await executeFunction(
        module,
        functionName,
        typeArgs,
        args,
        client,
        account.accountAddress.toString()
      );

      // Sign and submit the transaction
      const pendingTx = await client.signAndSubmitTransaction({
        signer: account,
        transaction
      });

      // Wait for transaction
      return await client.waitForTransaction({
        transactionHash: pendingTx.hash
      });
    } catch (err) {
      setError({
        message: 'Failed to execute function',
        details: err
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [module, client]);

  const getResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await getModuleResources(module, client);
    } catch (err) {
      setError({
        message: 'Failed to get resources',
        details: err
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [module, client]);

  const getModule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await getModuleInfo(module, client);
    } catch (err) {
      setError({
        message: 'Failed to get module info',
        details: err
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [module, client]);

  const getModuleEvents = useCallback(async (
    eventHandle: string,
    limit?: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      return await getEvents(module, eventHandle, client, limit);
    } catch (err) {
      setError({
        message: 'Failed to get events',
        details: err
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [module, client]);

  return {
    loading,
    error,
    callViewFunction,
    callFunction,
    getResources,
    getModule,
    getModuleEvents
  };
} 