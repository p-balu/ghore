// imports
const fs = require("fs");
const express = require("express");
const http = require("http");
const MarkdownIt = require("markdown-it");
const socketIo = require("socket.io");
const chokidar = require("chokidar");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Default file path
const defaultFilePath = "README.md";

// Get file path from command line arguments
const path =
  process.argv.length > 3 && process.argv[2] === "start"
    ? process.argv[3]
    : defaultFilePath;

console.log("path", path);
app.use("/node_modules", express.static(__dirname + "/node_modules"));
app.use(express.static("public")); // Serve static files efficiently

// Load and initialize Starry Night and MarkdownIt
async function initializeMarkdown() {
  const { createStarryNight, common } = await import("@wooorm/starry-night");
  const starryNight = await createStarryNight(common);
  const { toHtml } = await import("hast-util-to-html");

  const mdInstance = new MarkdownIt({
    highlight: function (str, lang) {
      if (lang === "mermaid") {
        return `<div class="mermaid">${str}</div>`; // Mermaid diagrams
      } else if (lang && starryNight.flagToScope(lang)) {
        const scope = starryNight.flagToScope(lang);
        try {
          const tree = starryNight.highlight(str, scope);
          return `<pre class="hljs"><code>${toHtml(tree)}</code></pre>`;
        } catch (error) {
          console.error(error);
          return "";
        }
      }
      return `<pre class="hljs"><code>${mdInstance.utils.escapeHtml(
        str
      )}</code></pre>`;
    },
  });

  return mdInstance;
}

// Setup Markdown rendering and file watching
initializeMarkdown().then((md) => {
  app.get("/", (req, res) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        console.error(err);
        res
          .status(500)
          .send("Error loading file. No file name README.md found");
        return;
      }
      res.send(renderHTML(md.render(data)));
    });
  });

  //file watch
  chokidar.watch(path).on("change", () => {
    fs.readFile(path, "utf8", (err, data) => {
      console.log("File change detected!!! Applying changes to the page...");
      if (err) {
        console.error(err);
        return;
      }
      io.emit("update markdown", md.render(data));
    });
  });
});

// Render HTML template
const renderHTML = (markdown) => `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/styles.css">
  <script src="/socket.io/socket.io.js"></script>
  <script src="node_modules/mermaid/dist/mermaid.min.js"></script>  
  <script>
    const socket = io();

    socket.on('update markdown', function(markdown) {
      document.getElementById('content').innerHTML = markdown;
      //Reinitializing mermaid 
      mermaid.init(undefined, content.querySelectorAll('.mermaid'));      });
  </script>
  <script>mermaid.initialize({startOnLoad:true});</script>
</head>
<body>
  <article class="markdown-body" id="content">${markdown}</article>
</body>
</html>`;

const port = 7878;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
