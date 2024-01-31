const express = require("express");
const http = require('http');
const path = require('path');
const fetch = require('fetch');

const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);


const PORT = process.env.PORT || 3000;


app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './index.html'));
});

let users = {}
let serverInfo = {};

getHostIdentifier().then(hostIdentifier => {
  console.log('Server name: ', hostIdentifier);
  serverInfo['name'] = hostIdentifier;
}).catch(error => console.log(error));


io.on('connection', async (socket) => {
  console.log('client connected');
  let socket_identifier = (Math.random() + 1).toString(36).substring(7)

  users[socket_identifier] = {
    x: Math.random() * 400,
    y: Math.random() * 400,
    ip: socket.conn.remoteAddress.split(":")[3],
  }

  socket.on('mouse-update', (mouse_position) => {
    users[socket_identifier].x = mouse_position.x
    users[socket_identifier].y = mouse_position.y
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected');
    delete users[socket_identifier];
  });

});

setInterval(function() {
  io.emit('position-update', {
    users,
    serverInfo,
  });
}, 10);

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});


function getHostIdentifier() {
  const { exec } = require('child_process');
  // const command = 'hostname -I';
  const command = 'hostname';
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        reject(new Error(stderr));
        return;
      }

      resolve(stdout.trim().split(" ")[0]);
    });
  });
}
