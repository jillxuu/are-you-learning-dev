import { Aptos, Network, AptosConfig } from '@aptos-labs/ts-sdk';

export enum ResponseErrorType {
  NOT_FOUND = "Not found",
  UNHANDLED = "Unhandled",
  TOO_MANY_REQUESTS = "Too Many Requests",
}

export type ResponseError =
  | { type: ResponseErrorType.NOT_FOUND; message?: string }
  | { type: ResponseErrorType.UNHANDLED; message: string }
  | { type: ResponseErrorType.TOO_MANY_REQUESTS; message?: string };

export async function withResponseError<T>(promise: Promise<T>): Promise<T> {
  return await promise.catch((error) => {
    console.error("API Error:", error);
    if (typeof error === "object" && "status" in error) {
      const response = error as Response;
      if (response.status === 404) {
        throw { type: ResponseErrorType.NOT_FOUND };
      }
      if (response.status === 429) {
        throw { type: ResponseErrorType.TOO_MANY_REQUESTS };
      }
    }

    throw {
      type: ResponseErrorType.UNHANDLED,
      message: error.toString(),
    };
  });
}

export function getAptosClient(network: Network): Aptos {
  const config = new AptosConfig({ 
    network,
    fullnode: network === Network.MAINNET 
      ? 'https://fullnode.mainnet.aptoslabs.com/v1'
      : network === Network.TESTNET
      ? 'https://fullnode.testnet.aptoslabs.com/v1'
      : 'https://fullnode.devnet.aptoslabs.com/v1'
  });

  return new Aptos(config);
} 