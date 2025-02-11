import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey, HexInput, AccountAddress } from '@aptos-labs/ts-sdk';
import { Move } from "@aptos-labs/ts-sdk/dist/common/cli/index.js";
import path from 'path';
import fs from 'fs';
import { compilePackageTask } from './moveUtils';

export interface DeploymentOptions {
  privateKey: string;
  network: 'devnet' | 'testnet' | 'mainnet';
  packageName: string;
  code: string;
  namedAddresses?: Record<string, HexInput>;
}

export interface DeploymentResult {
  success: boolean;
  error?: string;
  moduleAddress?: string;
}

const NETWORK_MAP = {
  devnet: Network.DEVNET,
  testnet: Network.TESTNET,
  mainnet: Network.MAINNET,
};

export async function deployMove(options: DeploymentOptions): Promise<DeploymentResult> {
  try {
    // Initialize Aptos client
    const config = new AptosConfig({ network: NETWORK_MAP[options.network] });
    const aptos = new Aptos(config);
    
    // Create account from private key
    const privateKeyBytes = new Ed25519PrivateKey(options.privateKey);
    const account = Account.fromPrivateKey({ privateKey: privateKeyBytes });

    // First compile the code
    await compilePackageTask({
      namedAddresses: {
        ...options.namedAddresses,
        deployer: account.accountAddress.toString()
      },
      packageName: options.packageName
    });

    // Get the package metadata
    const moveDir = path.resolve(process.cwd(), '..', 'move');
    const tempDir = path.join(moveDir, '.temp');
    const outputFile = path.join(tempDir, 'build', 'contract.json');

    if (!fs.existsSync(outputFile)) {
      return {
        success: false,
        error: 'Build output not found'
      };
    }

    // Transform addresses
    const transformedAddresses: Record<string, AccountAddress> = {};
    let address = account.accountAddress.toString();
    if (address.startsWith('0x')) {
      // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
      address = address.slice(2); // Remove '0x' prefix
    }
    address = '0x' + address.padStart(64, '0');
    transformedAddresses['deployer'] = AccountAddress.from(address);

    // Create the publish transaction
    const move = new Move();
    // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
    const response = await move.createObjectAndPublishPackage({
      packageDirectoryPath: tempDir,
      addressName: 'deployer',
      // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
      namedAddresses: transformedAddresses,
      extraArguments: [
        "--assume-yes",
        `--private-key=${account.privateKey}`,
        `--url=${aptos.config.fullnode}`,
      ],
      showStdout: true
    });

    return {
      success: true,
      moduleAddress: response.objectAddress
    };
  } catch (error) {
    console.error('Deployment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 
