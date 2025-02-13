import React, { useEffect, useState } from "react";
import { useContract } from "../../hooks/useContract";
import { Network } from "@aptos-labs/ts-sdk";
import { Code } from "./CodeSnippet";
import {
  PackageMetadata,
  useGetAccountPackages,
} from "../../hooks/useGetAccountResource";
import { getAptosClient } from "../../api/client";
import { Hex } from "@aptos-labs/ts-sdk";
import pako from "pako";

interface Props {
  address: string;
  network: Network;
  moduleName: string;
  onSourceUpdate: (source: string) => void;
}

interface ModuleSource {
  name: string;
  source: string;
}

export default function ViewCode({
  address,
  network,
  moduleName,
  onSourceUpdate,
}: Props) {
  const sortedPackages: PackageMetadata[] = useGetAccountPackages(address);
  const [moduleSource, setModuleSource] = useState<ModuleSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getModule } = useContract({
    network,
    address,
    moduleName,
  });

  useEffect(() => {
    if (moduleName && address) {
      loadModuleSource();
    }
  }, [moduleName, address, network]);

  const decodeManifest = (manifest: string): string | null => {
    try {
      // Remove 0x prefix if present
      const cleanManifest = manifest.startsWith("0x")
        ? manifest.slice(2)
        : manifest;

      // Convert hex to bytes
      const bytes = Hex.fromHexString(cleanManifest).toUint8Array();

      // Decompress gzip
      const decompressed = pako.ungzip(bytes, { to: "string" });

      // The decompressed data contains multiple files
      // Split by Move.toml to get the source files section
      const parts = decompressed.split("Move.toml");
      if (parts.length < 2) return null;

      // Find the module source file
      const sourceFileMatch = parts[1].match(
        new RegExp(`sources/${moduleName}\\.move([^]*)`, "i"),
      );
      if (!sourceFileMatch) return null;

      // Extract the source code
      const source = sourceFileMatch[1].trim();
      return source || null;
    } catch (err) {
      console.error("Failed to decode manifest:", err);
      return null;
    }
  };

  const loadModuleSource = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get source from manifest in packages
      const pkg = sortedPackages.find((p) =>
        p.modules.some((m) => m.name === moduleName),
      );

      if (pkg?.manifest) {
        const source = decodeManifest(pkg.manifest);
        if (source) {
          setModuleSource({
            name: moduleName,
            source,
          });
          onSourceUpdate(source);
          return;
        }
      }

      // If no manifest or decoding failed, construct readable source from ABI
      const moduleInfo = await getModule();
      if (moduleInfo.abi) {
        const source = generateSourceFromABI(moduleInfo.abi);
        setModuleSource({
          name: moduleInfo.abi.name,
          source,
        });
        onSourceUpdate(source);
      } else {
        throw new Error("No source code or ABI available");
      }
    } catch (err) {
      console.error("Failed to load module source:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load module source",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSourceFromABI = (abi: any): string => {
    let source = `module ${address}::${abi.name} {
    // Imports
    use std::string::String;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::{Self, MintRef, BurnRef, TransferRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::option::{Self, Option};

    // Structs
${
  abi.structs
    ?.map(
      (struct: any) => `    struct ${struct.name} {
${struct.fields?.map((field: any) => `        ${field.name}: ${field.type},`).join("\n")}
    }`,
    )
    .join("\n\n") || ""
}

    // Constants
${
  abi.exposed_functions
    ?.filter((fn: any) => fn.is_entry)
    .map(
      (fn: any) =>
        `    public entry fun ${fn.name}(${fn.params.map((p: any) => `${p}: ${p}`).join(", ")})${
          fn.return.length ? ` -> (${fn.return.join(", ")})` : ""
        } { /* ... */ }`,
    )
    .join("\n\n") || ""
}

    // View Functions
${
  abi.exposed_functions
    ?.filter((fn: any) => fn.is_view)
    .map(
      (fn: any) =>
        `    public fun ${fn.name}(${fn.params.map((p: any) => `${p}: ${p}`).join(", ")})${
          fn.return.length ? ` -> (${fn.return.join(", ")})` : ""
        } { /* ... */ }`,
    )
    .join("\n\n") || ""
}
}`;
    return source;
  };

  if (!address) {
    return (
      <div className="alert alert-warning">
        <span>No address provided</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  if (!moduleSource) {
    return (
      <div className="alert alert-info">
        <span>No module found with name: {moduleName}</span>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto">
          <Code bytecode={moduleSource.source} />
        </pre>
      </div>
    </div>
  );
}
