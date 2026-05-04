export const FC_CLIENT_CONNECT_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_CONNECT_TIMEOUT || '5') * 1000;
export const FC_CLIENT_READ_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_READ_TIMEOUT || '10') * 1000;

export function getCustomEndpoint(
  customEndpoint?: string,
  accountID?: string,
  region?: string,
): { endpoint: string; protocol: string } {
  const endpoint = customEndpoint || process.env.FC_CLIENT_CUSTOM_ENDPOINT;

  if (endpoint) {
    if (endpoint.startsWith('http://')) {
      return { protocol: 'http', endpoint };
    }
    if (endpoint.startsWith('https://')) {
      return { protocol: 'https', endpoint };
    }
    return { protocol: 'https', endpoint: `https://${endpoint}` };
  }

  return { protocol: 'https', endpoint: `${accountID}.${region}.fc.aliyuncs.com` };
}
