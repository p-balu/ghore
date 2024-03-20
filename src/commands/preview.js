const { Command } = require("@oclif/core");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class Preview extends Command {
  static description = "Preview a markdown file using server.js";

  static args = [
    {
      name: "file",
      required: false,
      description: "Markdown file to preview, defaults to README.md",
      default: "README.md",
    },
  ];

  async run() {
    let fileName = this.argv.length > 0 ? this.argv[0] : "README.md";
    if (this.argv.length <= 1) {
      if (!fs.existsSync(fileName)) {
        // Check if the specified file exists. If not, check if the default README.md exists.
        if (fileName !== "README.md" && fs.existsSync("README.md")) {
          this.log(
            `${fileName} does not exist. Found README.md, preparing to preview README.md.`
          );
          // Use the existing README.md if the specified file does not exist
          fileName = "README.md";
        } else {
          this.log(
            `${fileName} does not exist. Please provide a valid markdown file to preview.`
          );
          return; // Exit the command if no valid file is found
        }
      } else {
        this.log(`Preparing to preview: ${fileName}`);
      }

      const serverScriptPath = path.join(__dirname, "../../server.js");
      this.log(`Previewing ${fileName}`);

      const serverProcess = spawn(
        "node",
        [serverScriptPath, "start", fileName],
        {
          stdio: "inherit",
        }
      );

      serverProcess.on("close", (code) => {
        this.log(`Server process exited with code: ${code}`);
      });
    } else {
      this.log("You can only pass 1 argument(file path) or none");
    }
  }
}

module.exports = Preview;
