import { Network } from '@aptos-labs/ts-sdk';

export interface GetSpecs {
  id: number;
  creator_email: string;
  name: string;
  version: string;
  description: string;
  created_at: string;
}

export interface InstanceStatus {
  db_status: string;
  processor_status: string;
  api_status: string;
  route_status: string;
  overall_status: string;
  messages: string[];
}

export interface GetInstanceResponse {
  status: InstanceStatus;
  instance: {
    id: string;
    specId: number;
    config: {
      contractAddress: string;
      network: Network;
    };
  };
}

export class ShepherdClient {
  constructor(
    private readonly apiUrl: string,
    private readonly getHeaders: () => Record<string, string>
  ) {}

  private async request<TResult>(
    method: 'query' | 'mutation',
    path: string,
    input: unknown = null
  ): Promise<TResult> {
    const response = await fetch(`${this.apiUrl}/${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params: { path, input }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response not OK:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const { result } = await response.json();
    if (result.type === 'error') {
      throw new Error(result.data.message);
    }

    return result.data;
  }

  async getSpecs(): Promise<GetSpecs[]> {
    return this.request<GetSpecs[]>('query', 'get_specs');
  }

  async createInstance(input: {
    specId: number;
    config: {
      contractAddress: string;
      network: Network;
    };
  }): Promise<{ instanceId: string }> {
    return this.request<{ instanceId: string }>('mutation', 'create_instance', input);
  }

  async getInstance(instanceId: string): Promise<GetInstanceResponse> {
    return this.request<GetInstanceResponse>('query', 'get_instance', instanceId);
  }
} 