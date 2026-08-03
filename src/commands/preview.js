const { Command, Args, Flags } = require("@oclif/core");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class Preview extends Command {
  static description = "Preview a markdown file using server.js";

  static args = {
    file: Args.string({
      description: "Markdown file to preview, defaults to README.md",
      required: false,
    }),
  };

  static flags = {
    "no-open": Flags.boolean({
      description: "Do not open the preview in a browser",
      default: false,
    }),
  };

  async run() {
    const { args, flags } = await this.parse(Preview);
    let fileName = args.file || "README.md";

    let stats;
    try {
      stats = fs.statSync(fileName);
    } catch (err) {
      this.log(`File not found: ${fileName}`);
      return;
    }

    if (stats.isDirectory()) {
      const files = fs.readdirSync(fileName);
      const readmeFile = files.find((file) => file.toLowerCase() === "readme.md");
      if (!readmeFile) {
        this.log(
          `README.md file doesn't exist inside the specified directory.`,
        );
        return;
      }
      fileName = path.join(fileName, readmeFile);
      this.log(
        `Found ${readmeFile} at the path, preparing to preview ${readmeFile}.`,
      );
    } else if (!fs.existsSync(fileName)) {
      this.log(
        `${fileName} does not exist. Please provide a valid markdown file to preview.`,
      );
      return;
    }

    const serverScriptPath = path.join(__dirname, "../../server.js");
    this.log(`Previewing ${fileName}`);

    const serverArgs = [serverScriptPath, "start", fileName];
    if (flags["no-open"]) serverArgs.push("--no-open");
    const serverProcess = spawn(process.execPath, serverArgs, {
      stdio: "inherit",
    });

    serverProcess.on("close", (code) => {
      this.log(`Server process exited with code: ${code}`);
    });
  }
}

module.exports = Preview;
