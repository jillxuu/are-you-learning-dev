import { Network, AccountAddress, MoveResource } from "@aptos-labs/ts-sdk";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getAptosClient } from "../api/client";
import { orderBy } from "lodash";

export type ModuleMetadata = {
  name: string;
  source: string;
};

export type UpgradePolicy = {
  // 0 is arbitrary, i.e. publisher can upgrade anyway they want, they need to migrate the data manually
  // 1 is compatible
  // 2 is immutable
  policy: number;
};

export type PackageMetadata = {
  name: string;
  modules: ModuleMetadata[];
  upgrade_policy: UpgradePolicy;
  // The numbers of times this module has been upgraded. Also serves as the on-chain version.
  upgrade_number: string;
  // The source digest of the sources in the package. This is constructed by first building the
  // sha256 of each individual source, than sorting them alphabetically, and sha256 them again.
  source_digest: string;
  // Move.toml file
  manifest: string;
};

export interface ResponseError {
  type: string;
  message?: string;
}

export function useGetAccountResource(
  network: Network,
  address: string,
  resource: `${string}::${string}::${string}`,
): UseQueryResult<MoveResource, ResponseError> {
  const client = getAptosClient(network);

  return useQuery<MoveResource, ResponseError>({
    queryKey: ["accountResource", { address, resource }],
    queryFn: async () => {
      const accountAddress = AccountAddress.from(address);
      return await client.getAccountResource({
        accountAddress,
        resourceType: resource,
      });
    },
    refetchOnWindowFocus: false,
  });
}

export type RegistryData = {
  packages: Array<{
    name: string;
    modules: Array<{
      name: string;
      bytecode: string;
      source_map: string;
      extension: { vec: any[] };
    }>;
    deps: Array<{
      account: string;
      package_name: string;
    }>;
    extension: { vec: any[] };
    manifest: string;
    source_digest: string;
    upgrade_number: string;
    upgrade_policy: UpgradePolicy;
  }>;
};

export function useGetAccountPackages(network: Network, address: string) {
  const { data: registry } = useGetAccountResource(
    network,
    address,
    "0x1::code::PackageRegistry" as `${string}::${string}::${string}`,
  );

  const registryData = registry as unknown as RegistryData;

  if (!registryData || !registryData.packages) {
    return [];
  }

  // Transform the data to match our PackageMetadata type
  const packages: PackageMetadata[] = registryData.packages.map(
    (pkg): PackageMetadata => {
      return {
        name: pkg.name,
        modules: pkg.modules.map((module) => ({
          name: module.name,
          // Use bytecode as source since that's what we have
          source: module.bytecode,
        })),
        upgrade_policy: pkg.upgrade_policy,
        upgrade_number: pkg.upgrade_number,
        source_digest: pkg.source_digest,
        manifest: pkg.manifest,
      };
    },
  );

  return orderBy(packages, "name");
}
