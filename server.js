// imports
const fs = require("fs");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const chokidar = require("chokidar");
const cmarkGfm = require("cmark-gfm");
const { JSDOM } = require("jsdom");
const renderMarkdown = require("./src/components/renderMarkdown");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Default file path
const defaultFilePath = "README.md";

// Default port
const port = 5169;
const path =
  (process.argv[2] == "start" ? process.argv[3] : process.argv[2]) ||
  defaultFilePath;

console.log("Server is running on port:", port);

// Serve static files
app.use(
  "/mermaid.min.js",
  express.static(__dirname + "/public/lib/mermaid.min.js")
);
app.use("/styles.css", express.static(__dirname + "/public/styles.css"));
app.use(express.static("public"));

// Setup Markdown rendering and file watching
app.get("/", async (req, res) => {
  try {
    // Use the resolved path to read the file
    const data = await fs.promises.readFile(path, "utf8");

    const renderedHTML = await renderMarkdown(data);
    res.send(renderHTML(renderedHTML));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading file");
  }
});

// file watch
chokidar.watch(path).on("change", async () => {
  try {
    // Use the resolved path to read the file
    const data = await fs.promises.readFile(path, "utf8");
    console.log("File has been changed!!! Applying changes....");
    const renderedHTML = await renderMarkdown(data);

    io.emit("update markdown", renderedHTML);
  } catch (err) {
    console.error("file watch error:", err);
  }
});

// Render HTML template
const renderHTML = (markdown) => `<!DOCTYPE html>
<html>
<head>
  <title>README.md</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="/socket.io/socket.io.js"></script>
  <script src="/mermaid.min.js"></script>
    <script>
    const socket = io();

    socket.on('update markdown', function(markdown) {
      document.getElementById('content').innerHTML = markdown;
      // Reinitializing mermaid 
      mermaid.run(undefined, document.querySelectorAll('.mermaid'));
    });
  </script>
  <script>mermaid.run();</script>
</head>
<body>
  <article class="markdown-body" id="content">${markdown}</article>
</body>
</html>`;

// server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
