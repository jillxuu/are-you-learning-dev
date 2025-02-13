import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Network } from "@aptos-labs/ts-sdk";
import { getAptosClient } from "../../api/client";

interface ModuleMetadata {
  name: string;
  source: string;
  pkg?: string;
  abi?: {
    name: string;
    exposed_functions: Array<{
      name: string;
      visibility: string;
      is_entry: boolean;
      is_view: boolean;
      generic_type_params: any[];
      params: string[];
      return: string[];
    }>;
  };
}

interface PackageMetadata {
  name: string;
  modules: ModuleMetadata[];
  upgrade_policy: {
    policy: number;
  };
  upgrade_number: number;
  source_digest: string;
  manifest: string;
}

interface PackageSidebarProps {
  sortedPackages: PackageMetadata[];
  selectedPackageName: string;
  getLinkToPackage(moduleName: string): string;
  navigateToPackage(moduleName: string): void;
}

interface PackageContentProps {
  address: string;
  packageMetadata: PackageMetadata;
  packageName: string;
}

interface Props {
  address: string;
  network: Network;
  packageName: string;
}

export default function Packages({ address, network, packageName }: Props) {
  const navigate = useNavigate();
  const selectedPackageName = useParams().selectedModuleName ?? "";
  const [packages, setPackages] = useState<PackageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchModules() {
      if (!mounted) return;

      try {
        setLoading(true);
        setError(null);

        const client = getAptosClient(network);
        const modules = await client.getAccountModules({
          accountAddress: address,
        });

        if (!mounted) return;

        // Transform modules into package format
        const packageMetadata: PackageMetadata = {
          name: packageName,
          modules: modules.map((module) => ({
            name: module.abi?.name || "",
            source: module.bytecode || "",
            abi: module.abi,
          })),
          upgrade_policy: {
            policy: 1, // Compatible by default
          },
          upgrade_number: 1,
          source_digest: "",
          manifest: JSON.stringify(modules, null, 2),
        };

        setPackages([packageMetadata]);
      } catch (err) {
        if (!mounted) return;

        console.error("Failed to load modules:", err);
        setError("Failed to load modules. Please try again.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchModules();
    return () => {
      mounted = false;
    };
  }, [address, network]);

  useEffect(() => {
    if (!selectedPackageName && packages.length > 0) {
      navigate(`/modules/${address}/packages/${packages[0].name}`, {
        replace: true,
      });
    }
  }, [selectedPackageName, packages, address, navigate]);

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

  if (packages.length === 0) {
    return (
      <div className="alert alert-info">
        <span>No packages found for this address</span>
      </div>
    );
  }

  const selectedPackage = packages.find(
    (pkg) => pkg.name === selectedPackageName,
  );

  function getLinkToPackage(moduleName: string) {
    return `/modules/${address}/packages/${moduleName}`;
  }

  function navigateToPackage(moduleName: string) {
    navigate(getLinkToPackage(moduleName));
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-3">
        <PackagesSidebar
          sortedPackages={packages}
          selectedPackageName={selectedPackageName}
          getLinkToPackage={getLinkToPackage}
          navigateToPackage={navigateToPackage}
        />
      </div>
      <div className="col-span-9">
        {selectedPackage === undefined ? (
          <div className="alert alert-info">
            <span>No package found with name: {selectedPackageName}</span>
          </div>
        ) : (
          <PackageContent
            address={address}
            packageMetadata={selectedPackage}
            packageName={selectedPackageName}
          />
        )}
      </div>
    </div>
  );
}

function PackagesSidebar({
  sortedPackages,
  selectedPackageName,
  navigateToPackage,
}: PackageSidebarProps) {
  return (
    <div className="bg-base-200 p-6 rounded-lg">
      <div className="space-y-3">
        {sortedPackages.map((pkg) => (
          <div key={pkg.name}>
            <button
              className={`btn btn-ghost w-full justify-start ${
                pkg.name === selectedPackageName ? "btn-active" : ""
              }`}
              onClick={() => navigateToPackage(pkg.name)}
            >
              {pkg.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageContent({
  address,
  packageMetadata,
  packageName,
}: PackageContentProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-base-200 p-6 rounded-lg">
      <div className="flex justify-between items-center flex-wrap">
        <h2 className="text-2xl font-bold">{packageName}</h2>
      </div>
      <div className="divider"></div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Modules</h3>
          <select
            className="select select-bordered w-full"
            defaultValue={packageMetadata.modules[0]?.name}
            onChange={(e) => {
              const moduleName = e.target.value;
              navigate(`/modules/${address}/code/${moduleName}`);
            }}
          >
            {packageMetadata.modules.map((module) => (
              <option key={module.name} value={module.name}>
                {module.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Package Name</h3>
          <p>{packageMetadata.name}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Upgrade Policy</h3>
          <p>{upgrade_policy(packageMetadata.upgrade_policy.policy)}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Upgrade Number</h3>
          <p>{packageMetadata.upgrade_number}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Source Digest</h3>
          <p className="break-all">{packageMetadata.source_digest}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Package Manifest</h3>
          <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono text-sm">
            {JSON.stringify(JSON.parse(packageMetadata.manifest), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function upgrade_policy(policyNumber: number): string {
  switch (policyNumber) {
    case 0:
      return "Arbitrary";
    case 1:
      return "Compatible";
    case 3:
      return "Immutable";
    default:
      return "Unknown";
  }
}
