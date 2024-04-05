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
      // Reading the current directory's contents
      const files = fs.readdirSync(process.cwd());

      // Trying to find a file that matches README.md in a case-insensitive manner
      const readmeFile = files.find(
        (file) => file.toLowerCase() === "readme.md"
      );

      fs.stat(fileName, (err, stats) => {
        if (err) {
          this.log(`File not found: ${fileName}`);
          return; // Prevents further execution if the file is not found
        }

        if (stats.isDirectory()) {
          // Handle directory case
          fileName =
            readmeFile && readmeFile.toLowerCase() === "readme.md"
              ? path.join(process.cwd(), readmeFile)
              : null;
          if (!fileName) {
            this.log(
              `README.md file doesn't exist inside the specified directory.`
            );
            return; //exit command if no valid file is foung
          }
          this.log(
            `Found ${readmeFile} at the path, preparing to preview ${readmeFile}.`
          );
        } else if (!fs.existsSync(fileName)) {
          this.log(
            `${fileName} does not exist. Please provide a valid markdown file to preview.`
          );
          return; // exit if the specified markdown file doesn't exist
        }

        // If the file exists or a README.md is found in a directory, starting the server
        const serverScriptPath = path.join(__dirname, "../../server.js");
        this.log(`Previewing ${fileName}`);

        const serverProcess = spawn(
          "node",
          [serverScriptPath, "start", fileName],
          { stdio: "inherit" }
        );

        serverProcess.on("close", (code) => {
          this.log(`Server process exited with code: ${code}`);
        });
      });
    } else {
      this.log("You can only pass 1 argument(file path) or none");
    }
  }
}

module.exports = Preview;
