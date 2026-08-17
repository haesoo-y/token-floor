export type CliCommand = "start" | "install" | "diagnose" | "uninstall";

export interface CliOptions {
  command: CliCommand;
  port?: string;
  deleteLocalData: boolean;
  help: boolean;
  version: boolean;
}

const COMMANDS = new Set<CliCommand>(["start", "install", "diagnose", "uninstall"]);

export function parseCli(argv: string[]): CliOptions {
  const args = [...argv];
  let command: CliCommand = "start";
  if (args[0] && !args[0].startsWith("-")) {
    const candidate = args.shift() as string;
    if (!COMMANDS.has(candidate as CliCommand))
      throw new TypeError(`Unknown command: ${candidate}`);
    command = candidate as CliCommand;
  }
  let port: string | undefined;
  let deleteLocalData = false;
  let help = false;
  let version = false;
  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--port") {
      if (port !== undefined) throw new TypeError("--port may only be provided once");
      const value = args.shift();
      if (value === undefined || value.startsWith("-")) throw new TypeError("--port needs a value");
      port = value;
    } else if (argument === "--delete-local-data") deleteLocalData = true;
    else if (argument === "--help" || argument === "-h") help = true;
    else if (argument === "--version" || argument === "-v") version = true;
    else throw new TypeError(`Unknown option: ${argument}`);
  }
  if (deleteLocalData && command !== "uninstall") {
    throw new TypeError("--delete-local-data is only valid with uninstall");
  }
  if (port !== undefined && command === "uninstall") {
    throw new TypeError("--port is not valid with uninstall");
  }
  return { command, ...(port === undefined ? {} : { port }), deleteLocalData, help, version };
}
