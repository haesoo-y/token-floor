import { defaultRuntime, runCli } from "./run.js";

process.exitCode = await runCli(defaultRuntime());
