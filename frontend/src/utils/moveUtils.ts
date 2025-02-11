import { AccountAddressInput, AccountAddress } from "@aptos-labs/ts-sdk";
import { Move } from "@aptos-labs/ts-sdk/dist/common/cli/index.js";
import path from 'path'
import fs from 'fs'
import toml from 'toml'

/**
 * Find the Move.toml file for a given package name
 * @param folderPath - The path to search in
 * @param packageName - The name of the package to find
 * @returns The path to the Move.toml file and its parsed content
 */
export async function findMoveToml(folderPath: string, packageName: string): Promise<{ path: string; content: any } | null> {
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
            content: parsedContent
          };
        }
      }

      if (stats.isDirectory() && item !== 'build' && item !== '.temp') {
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

  const packagePath = path.resolve(process.cwd(), '..', 'move');
  const outputFile = path.join(packagePath, 'build', `${packageName}.json`);

  // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
  await new Move().buildPublishPayload({
    outputFile,
    packageDirectoryPath: packagePath,
    // @ts-ignore Type compatibility between ESM and CommonJS AccountAddress
    namedAddresses: transformedAddresses,
    extraArguments: ["--assume-yes", "--skip-fetch-latest-git-deps"],
    showStdout: true
  });
};
