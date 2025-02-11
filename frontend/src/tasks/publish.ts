import { Ed25519Account, AccountAddress, AccountAddressInput, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { Move } from "@aptos-labs/ts-sdk/dist/common/cli/index.js";
import path from 'path';
import fs from 'fs';

interface PublishResult {
  success: boolean;
  address?: string;
  error?: string;
  output?: string;
}

interface PublishOptions {
  privateKey?: string;
  packageName?: string;
  nodeUrl?: string;
  code?: string;
}

/**
 * Publish a package to the Aptos blockchain
 * @returns The address of the published package
 */
export const publishMovePackageTask = async (args: {
  publisher: Ed25519Account;
  namedAddresses: Record<string, AccountAddressInput>;
  addressName: string;
  packageName: string;
}): Promise<string> => {
  const { publisher, namedAddresses, addressName, packageName } = args;

  // Transform AccountAddressInput to AccountAddress type
  const transformedAddresses: Record<string, AccountAddress> = {};
  for (const key in namedAddresses) {
    if (namedAddresses.hasOwnProperty(key)) {
      transformedAddresses[key] = AccountAddress.from(namedAddresses[key]);
    }
  }

  const packagePath = path.resolve(process.cwd(), '..', 'move');

  // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
  const response = await new Move().createObjectAndPublishPackage({
    packageDirectoryPath: packagePath,
    addressName,
    // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
    namedAddresses: transformedAddresses,
    extraArguments: [
      "--assume-yes",
      `--private-key=${publisher.privateKey}`,
      `--url=${process.env.VITE_APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com'}`,
    ],
    showStdout: true
  });

  return response.objectAddress;
};

/**
 * Higher level function that handles account creation and error handling
 */
export const publishMovePackage = async (options: {
  privateKey: string;
  packageName: string;
}): Promise<PublishResult> => {
  const { 
    privateKey,
    packageName,
  } = options;

  if (!privateKey) {
    return {
      success: false,
      error: 'Private key is required. Set VITE_APTOS_PRIVATE_KEY in your .env file or pass it as an option.'
    };
  }

  try {
    // Create publisher account
    const publisher = new Ed25519Account({
      privateKey: new Ed25519PrivateKey(privateKey)
    });

    // Set up named addresses
    const namedAddresses: Record<string, AccountAddressInput> = {
      [packageName]: publisher.accountAddress
    };

    // Use the task function
    const address = await publishMovePackageTask({
      publisher,
      namedAddresses,
      addressName: packageName,
      packageName
    });

    return {
      success: true,
      address
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Publishing error:', errorMessage);
    return {
      success: false,
      error: `Failed to publish Move package: ${errorMessage}`
    };
  }
}; 
