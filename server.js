// imports
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const chokidar = require("chokidar");
const open = require("open");
const renderMarkdown = require("./src/components/renderMarkdown");

const PORT_RANGE_START = 5169;
const PORT_RANGE_END = 5200;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const defaultFilePath = "README.md";
const markdownFile =
  (process.argv[2] === "start" ? process.argv[3] : process.argv[2]) ||
  defaultFilePath;
const resolvedFile = path.resolve(markdownFile);
const fileDir = path.dirname(resolvedFile);
const fileName = path.basename(resolvedFile);

// -- Port detection ----------------------------------------------------------

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port);
  });
}

async function findFreePort() {
  for (let p = PORT_RANGE_START; p <= PORT_RANGE_END; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(
    `No free port found in range ${PORT_RANGE_START}-${PORT_RANGE_END}`
  );
}

// -- Instance tracking -------------------------------------------------------

function getGhoreTmpDir() {
  const tmpDir = os.tmpdir();
  const existing = fs
    .readdirSync(tmpDir)
    .find(
      (e) =>
        e.startsWith("ghore-") &&
        fs.statSync(path.join(tmpDir, e)).isDirectory()
    );
  if (existing) return path.join(tmpDir, existing);
  return fs.mkdtempSync(path.join(tmpDir, "ghore-"));
}

function registerInstance(tmpDir, url) {
  const instancesFile = path.join(tmpDir, "instances");
  const line = `${fileDir}; ${fileName}; ${url}`;
  fs.appendFileSync(instancesFile, line + "\n");
}

function unregisterInstance(tmpDir, url) {
  const instancesFile = path.join(tmpDir, "instances");
  if (!fs.existsSync(instancesFile)) return;
  const lines = fs.readFileSync(instancesFile, "utf8").split("\n");
  const filtered = lines.filter((l) => l !== "" && !l.includes(url));
  fs.writeFileSync(instancesFile, filtered.length ? filtered.join("\n") + "\n" : "");
}

// -- Static files ------------------------------------------------------------

app.use(
  "/mermaid.min.js",
  express.static(__dirname + "/public/lib/mermaid.min.js")
);
app.use("/styles.css", express.static(__dirname + "/public/styles.css"));
app.use(express.static("public"));

// -- Routes ------------------------------------------------------------------

app.get("/", async (req, res) => {
  try {
    const data = await fs.promises.readFile(resolvedFile, "utf8");
    const renderedHTML = await renderMarkdown(data);
    res.send(renderHTML(renderedHTML));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading file");
  }
});

// -- File watch --------------------------------------------------------------

chokidar.watch(resolvedFile).on("change", async () => {
  try {
    const data = await fs.promises.readFile(resolvedFile, "utf8");
    console.log("File has been changed!!! Applying changes....");
    const renderedHTML = await renderMarkdown(data);
    io.emit("update markdown", renderedHTML);
  } catch (err) {
    console.error("file watch error:", err);
  }
});

// -- HTML template -----------------------------------------------------------

const renderHTML = (markdown) => `<!DOCTYPE html>
<html>
<head>
  <title>${fileName}</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="/socket.io/socket.io.js"></script>
  <script src="/mermaid.min.js"></script>
  <script>
    const socket = io();
    socket.on('update markdown', function(markdown) {
      document.getElementById('content').innerHTML = markdown;
      mermaid.run(undefined, document.querySelectorAll('.mermaid'));
    });
  </script>
  <script>mermaid.run();</script>
</head>
<body>
  <article class="markdown-body" id="content">${markdown}</article>
</body>
</html>`;

// -- Server startup ----------------------------------------------------------

(async () => {
  const port = await findFreePort();
  const url = `http://localhost:${port}/`;
  const tmpDir = getGhoreTmpDir();

  registerInstance(tmpDir, url);
  console.log(`Instance list: ${path.join(tmpDir, "instances")}`);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    unregisterInstance(tmpDir, url);
  }

  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("exit", cleanup);

  server.listen(port, () => {
    console.log(`Previewing: ${resolvedFile}`);
    console.log(`Server running at ${url}`);
    open(url);
  });
})();
