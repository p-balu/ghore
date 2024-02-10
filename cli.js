#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const cli = async () => {
  let fileName = process.argv[2] || "README.md"; // Default to README.md if not provided

  // If the provided argument is not a file name, assume it as an additional argument
  if (!fs.existsSync(fileName)) {
    fileName = "README.md"; // Default to README.md if the argument is not a file name
  }

  // Extract additional arguments
  const additionalArgs = process.argv.slice(3);

  // Get the absolute path to the server.js script
  const serverScriptPath = path.join(__dirname, "server.js");

  const serverProcess = spawn(
    "node",
    [serverScriptPath, "start", fileName, ...additionalArgs],
    { stdio: "inherit" } // Inherit stdout and stderr to the current process
  );

  serverProcess.on("close", (code) => {
    console.log(`Server process exited with code ${code}`);
  });
};

cli();
