export const DEFAULT_TOKEN_FLOOR_PORT = 4317;

export interface PortSources {
  cli?: string;
  environment?: string;
  installed?: number;
}

/** Resolves the single Token Floor port using CLI, environment, config, then default precedence. */
export function resolveTokenFloorPort(sources: PortSources): number {
  if (sources.cli !== undefined) return parseTokenFloorPort(sources.cli, "--port");
  if (sources.environment !== undefined) {
    return parseTokenFloorPort(sources.environment, "TOKEN_FLOOR_PORT");
  }
  if (sources.installed !== undefined) {
    return parseTokenFloorPort(String(sources.installed), "installed config");
  }
  return DEFAULT_TOKEN_FLOOR_PORT;
}

export function parseTokenFloorPort(value: string, source = "port"): number {
  if (!/^[0-9]+$/.test(value)) throw new TypeError(`${source} must be an integer from 1 to 65535`);
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(`${source} must be an integer from 1 to 65535`);
  }
  return port;
}

export function loopbackUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}
