import { Move } from "@aptos-labs/ts-sdk/dist/common/cli/index.js";
import path from "path";
import fs from "fs";
import toml from "toml";
import {
  Ed25519Account,
  AccountAddress,
  AccountAddressInput,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

interface PublishResult {
  success: boolean;
  address?: string;
  error?: string;
  output?: string;
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

  const packagePath = path.resolve(process.cwd(), "..", "move");

  // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
  const response = await new Move().createObjectAndPublishPackage({
    packageDirectoryPath: packagePath,
    addressName,
    // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
    namedAddresses: transformedAddresses,
    extraArguments: [
      "--assume-yes",
      `--private-key=${publisher.privateKey}`,
      `--url=${process.env.APTOS_NODE_URL || "https://fullnode.devnet.aptoslabs.com"}`,
    ],
    showStdout: true,
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
  const { privateKey, packageName } = options;

  if (!privateKey) {
    return {
      success: false,
      error:
        "Private key is required. Set APTOS_PRIVATE_KEY in your .env file or pass it as an option.",
    };
  }

  try {
    // Create publisher account
    const publisher = new Ed25519Account({
      privateKey: new Ed25519PrivateKey(privateKey),
    });

    // Set up named addresses
    const namedAddresses: Record<string, AccountAddressInput> = {
      [packageName]: publisher.accountAddress,
    };

    // Use the task function
    const address = await publishMovePackageTask({
      publisher,
      namedAddresses,
      addressName: packageName,
      packageName,
    });

    return {
      success: true,
      address,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Publishing error:", errorMessage);
    return {
      success: false,
      error: `Failed to publish Move package: ${errorMessage}`,
    };
  }
};

/**
 * Find the Move.toml file for a given package name
 * @param folderPath - The path to search in
 * @param packageName - The name of the package to find
 * @returns The path to the Move.toml file and its parsed content
 */
export async function findMoveToml(
  folderPath: string,
  packageName: string,
): Promise<{ path: string; content: any } | null> {
  try {
    const items = await fs.promises.readdir(folderPath);

    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stats = await fs.promises.stat(itemPath);

      if (stats.isFile() && item === "Move.toml") {
        // Read and parse the Move.toml file
        const fileContent = await fs.promises.readFile(itemPath, "utf8");
        const parsedContent = toml.parse(fileContent);

        // Check if this is the package we're looking for
        if (parsedContent.package?.name === packageName) {
          return {
            path: itemPath,
            content: parsedContent,
          };
        }
      }

      if (stats.isDirectory() && item !== "build" && item !== ".temp") {
        const result = await findMoveToml(itemPath, packageName);
        if (result) {
          return result;
        }
      }
    }
  } catch (error) {
    console.error(`Error searching in ${folderPath}:`, error);
  }

  return null;
}

/**
 * Compiles a Move contract using the Aptos SDK
 * @param options Compilation options
 * @returns CompilationResult with success status and output/error
 */
export const compilePackageTask = async (args: {
  namedAddresses: Record<string, AccountAddressInput>;
  packageName: string;
}) => {
  const { namedAddresses, packageName } = args;

  // Transform AccountAddressInput to AccountAddress type
  const transformedAddresses: Record<string, AccountAddress> = {};
  for (const key in namedAddresses) {
    if (namedAddresses.hasOwnProperty(key)) {
      transformedAddresses[key] = AccountAddress.from(namedAddresses[key]);
    }
  }

  const packagePath = path.resolve(process.cwd(), "..", "move");
  const outputFile = path.join(packagePath, "build", `${packageName}.json`);

  // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
  await new Move().buildPublishPayload({
    outputFile,
    packageDirectoryPath: packagePath,
    // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
    namedAddresses: transformedAddresses,
    extraArguments: ["--assume-yes", "--skip-fetch-latest-git-deps"],
    showStdout: true,
  });
};
