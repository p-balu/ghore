const fs = require("fs");
const express = require("express");
const http = require("http");
const MarkdownIt = require("markdown-it");
const socketIo = require("socket.io");

const app = express();
const md = new MarkdownIt();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  fs.readFile("README.md", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error loading file");
      return;
    }
    res.send(renderHTML(md.render(data)));
  });
});

fs.watchFile("README.md", (eventType, filename) => {
  console.log("Applying changes....")
  if (filename) {
    fs.readFile("README.md", "utf8", (err, data) => {
      if (err) {
        console.error(err);
        return;
      }
      io.emit('updateMarkdown', md.render(data));
    });
  }
});

const renderHTML = (markdown) => {
  return `<!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();

          socket.on('updateMarkdown', function(markdown) {
            document.getElementById('content').innerHTML = markdown;
          });
        </script>
      </head>
      <body>
        <article class="markdown-body" id="content">
          ${markdown}
        </article>
      </body>
    </html>`;
};

const port = 7878;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
