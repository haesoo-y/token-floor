export interface HealthPayload {
  status: "ok";
  service: "token-floor";
  version: string;
  uptimeSeconds: number;
}

export function createHealthPayload(uptimeSeconds: number): HealthPayload {
  return {
    status: "ok",
    service: "token-floor",
    version: "0.2.0",
    uptimeSeconds: Math.floor(uptimeSeconds)
  };
}
