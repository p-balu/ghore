const { Command, Args } = require("@oclif/core");
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

  async run() {
    const { args } = await this.parse(Preview);
    let fileName = args.file || "README.md";

    const files = fs.readdirSync(process.cwd());
    const readmeFile = files.find(
      (file) => file.toLowerCase() === "readme.md"
    );

    let stats;
    try {
      stats = fs.statSync(fileName);
    } catch (err) {
      this.log(`File not found: ${fileName}`);
      return;
    }

    if (stats.isDirectory()) {
      if (!readmeFile) {
        this.log(`README.md file doesn't exist inside the specified directory.`);
        return;
      }
      fileName = path.join(process.cwd(), readmeFile);
      this.log(`Found ${readmeFile} at the path, preparing to preview ${readmeFile}.`);
    } else if (!fs.existsSync(fileName)) {
      this.log(`${fileName} does not exist. Please provide a valid markdown file to preview.`);
      return;
    }

    const serverScriptPath = path.join(__dirname, "../../server.js");
    this.log(`Previewing ${fileName}`);

    const serverProcess = spawn("node", [serverScriptPath, "start", fileName], {
      stdio: "inherit",
    });

    serverProcess.on("close", (code) => {
      this.log(`Server process exited with code: ${code}`);
    });
  }
}

module.exports = Preview;
