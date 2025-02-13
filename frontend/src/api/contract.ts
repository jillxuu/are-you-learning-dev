import {
  AccountAddress,
  Aptos,
  MoveModuleBytecode,
  MoveResource,
  MoveValue,
  InputGenerateTransactionPayloadData,
  InputViewFunctionData,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import { withResponseError } from "./client";

export interface ContractModule {
  address: string;
  moduleName: string;
}

export async function getModuleInfo(
  module: ContractModule,
  client: Aptos,
  ledgerVersion?: number,
): Promise<MoveModuleBytecode> {
  const { address, moduleName } = module;
  const options = ledgerVersion
    ? { ledgerVersion: BigInt(ledgerVersion) }
    : undefined;
  return withResponseError(
    client.getAccountModule({
      accountAddress: AccountAddress.from(address),
      moduleName,
      options,
    }),
  );
}

export async function getModuleResources(
  module: ContractModule,
  client: Aptos,
  ledgerVersion?: number,
): Promise<MoveResource[]> {
  const { address } = module;
  const options = ledgerVersion
    ? { ledgerVersion: BigInt(ledgerVersion) }
    : undefined;
  return withResponseError(
    client.getAccountResources({
      accountAddress: AccountAddress.from(address),
      options,
    }),
  );
}

export async function viewFunction(
  module: ContractModule,
  functionName: string,
  args: any[],
  typeArgs: string[] = [],
  client: Aptos,
): Promise<MoveValue[]> {
  const payload: InputViewFunctionData = {
    function: `${module.address}::${module.moduleName}::${functionName}`,
    typeArguments: typeArgs,
    functionArguments: args,
  };

  return withResponseError(client.view({ payload }));
}

export async function executeFunction(
  module: ContractModule,
  functionName: string,
  typeArgs: string[],
  args: any[],
  client: Aptos,
  senderAddress: string,
): Promise<SimpleTransaction> {
  const payload: InputGenerateTransactionPayloadData = {
    function: `${module.address}::${module.moduleName}::${functionName}`,
    typeArguments: typeArgs,
    functionArguments: args,
  };

  return withResponseError(
    client.transaction.build.simple({
      sender: AccountAddress.from(senderAddress),
      data: payload,
    }),
  );
}

export async function getEvents(
  module: ContractModule,
  eventHandle: string,
  client: Aptos,
  limit?: number,
): Promise<any[]> {
  return withResponseError(
    client.getAccountEventsByEventType({
      accountAddress: AccountAddress.from(module.address),
      eventType: `${module.address}::${module.moduleName}::${eventHandle}`,
      options: { limit },
    }),
  );
}
