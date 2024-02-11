#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const cli = async () => {
  // Default to README.md if not provided
  let fileName = process.argv[2] || "README.md";

  // If the provided argument is not a file name, assume it as an additional argument
  if (!fs.existsSync(fileName)) {
    // Default to README.md if the argument is not a file name
    fileName = "README.md";
  }

  // Extract additional arguments
  const additionalArgs = process.argv.slice(3);

  // Get the absolute path to the server.js script
  const serverScriptPath = path.join(__dirname, "server.js");

  // Inherit stdout and stderr to the current process
  const serverProcess = spawn(
    "node",
    [serverScriptPath, "start", fileName, ...additionalArgs],
    { stdio: "inherit" }
  );

  serverProcess.on("close", (code) => {
    console.log(`Server process exited with code ${code}`);
  });
};

cli();
