// imports
const fs = require("fs");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const chokidar = require("chokidar");
const cmarkGfm = require("cmark-gfm");
const { JSDOM } = require("jsdom");

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

// Serve static files
app.use("/node_modules", express.static(__dirname + "/node_modules"));
app.use(express.static("public"));

const renderMarkdown = async (data) => {
  // Converting Markdown to HTML using cmark-gfm
  const html = await cmarkGfm.renderHtml(data);

  // Create a JSDOM instance from the HTML output
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Finding  all code blocks
  const codeBlocks = document.querySelectorAll("code");

  //syntax highlighting to each code block
  for (const block of codeBlocks) {
    //language class follows this pattern
    const lang = block.className.split("language-")[1]; 
    if (lang) {
      const highlighted = await highlightCode(lang, block.textContent);
      // Replacing the inner HTML of the code block
      block.innerHTML = highlighted; 
    }
  }

  // updated HTML
  return dom.serialize();
};

//highlighting code by integrating both Starry night and mermaid
const highlightCode = async (lang, str) => {
  const { createStarryNight, common } = await import("@wooorm/starry-night");
  const sourceCss = await import("@wooorm/starry-night/source.css");

  const starryNight = await createStarryNight(common, [sourceCss]);
  const { toHtml } = await import("hast-util-to-html");

  if (lang === "mermaid") {
    // Mermaid diagrams
    return `<div class="mermaid">${str}</div>`; 
  } else if (lang && starryNight.flagToScope(lang)) {
    try {
      const highlighted = starryNight.highlight(
        str,
        starryNight.flagToScope(lang)
      );
      return `<pre class="hljs"><code>${toHtml(highlighted)}</code></pre>`;
    } catch (error) {
      console.error("Error highlighting code:", error);
       // Fallback to simple highlighting
      return `<pre class="hljs"><code>${str}</code></pre>`;
    }
  } else {
    // Default highlighting
    return `<pre class="hljs"><code>${str}</code></pre>`; 
  }
};

// Setup Markdown rendering and file watching
app.get("/", async (req, res) => {
  try {
    const data = await fs.promises.readFile(path, "utf8");

    const renderedHTML = await renderMarkdown(data); 
    res.send(renderHTML(renderedHTML));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send(
        "Error loading file, Please specify path of README.md file along with the start command"
      );
  }
});

//file watch
chokidar.watch(path).on("change", async () => {
  try {
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
  <link rel="stylesheet" href="/node_modules/@wooorm/starry-night/dist/index.css">
  <script src="/socket.io/socket.io.js"></script>
  <script src="/node_modules/mermaid/dist/mermaid.min.js"></script>
    <script>
    const socket = io();

    socket.on('update markdown', function(markdown) {
      document.getElementById('content').innerHTML = markdown;
      // Reinitializing mermaid 
      mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    });
    
  </script>
  <script>mermaid.initialize({startOnLoad:true});</script>
</head>
<body>
  <article class="markdown-body" id="content">${markdown}</article>
</body>
</html>`;

//server
const port = 7878;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
