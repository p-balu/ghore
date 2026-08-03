// imports
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const chokidar = require("chokidar");
const renderMarkdown = require("./src/components/renderMarkdown");

const PORT_RANGE_START = 5169;
const PORT_RANGE_END = 5200;
const LOOPBACK_HOST = "127.0.0.1";

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
const shouldOpenBrowser = !process.argv.includes("--no-open");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

// -- Port detection ----------------------------------------------------------

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port, LOOPBACK_HOST);
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
  const userId = typeof process.getuid === "function" ? process.getuid() : "user";
  const ghoreTmpDir = path.join(tmpDir, `ghore-${userId}`);

  try {
    fs.mkdirSync(ghoreTmpDir, { mode: 0o700 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const stats = fs.lstatSync(ghoreTmpDir);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`Unsafe instance directory: ${ghoreTmpDir}`);
    }
    if (typeof process.getuid === "function" && stats.uid !== process.getuid()) {
      throw new Error(`Instance directory is owned by another user: ${ghoreTmpDir}`);
    }
    fs.chmodSync(ghoreTmpDir, 0o700);
  }

  return ghoreTmpDir;
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
  <title>${escapeHtml(fileName)}</title>
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
  const url = `http://${LOOPBACK_HOST}:${port}/`;
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

  server.listen(port, LOOPBACK_HOST, async () => {
    console.log(`Previewing: ${resolvedFile}`);
    console.log(`Server running at ${url}`);
    if (shouldOpenBrowser) {
      const { default: open } = await import("open");
      await open(url);
    }
  });
})();
