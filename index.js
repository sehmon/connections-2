const express = require("express");
const http = require('http');
const path = require('path');
const fetch = require('fetch');

const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let users = {}
let serverInfo = {};

getHostIdentifier().then(hostIdentifier => {
  serverInfo['name'] = hostIdentifier;
}).catch(error => console.log(error));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './index.html'));
});

io.on('connection', async (socket) => {
  console.log('client connected');
  let socket_identifier = (Math.random() + 1).toString(36).substring(7)

  users[socket_identifier] = {
    x: Math.random() * 400,
    y: Math.random() * 400,
    ip: socket.conn.remoteAddress.split(":")[3],
  }

  traceIPRoute("8.8.8.8").then((ret) => {
    console.log(ret);
  }).catch((err) => {
    console.log(err);
  });

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

function traceIPRoute(ip) {
  return new Promise((resolve, reject) => {
    // Create the new GraphNode and prep for the traceroute
    //
    /*
    let userNode = new GraphNode(user.screenName, user.ip, user.deviceType);
    let path = [];
    let hop = 0;
    let prev = this.networkGraph.root;
    let { name, ip } = this.networkGraph.root;
    path.push({
      name,
      ip,
      hop,
    });
    this.networkGraph.addNode(userNode);
    this.networkGraph.addNodeUserPair(user.userID, ip);
    prev.addChild(userNode);
    */

    let path = [];

    const child = spawn('traceroute', ['-q', '1', ip]);

    child.stderr.on('data', (data) => {
      reject(new Error(`stderr: ${data}`));
    });

    // Following regex gets each servername/ip pair from the traceroute output
    const regex = /(\S+)\s+\((\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b)\)|(\*)/g;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      for (const match of chunk.toString().matchAll(regex)) {
        hop += 1;
        if (match[3]) { // If the third capture group (asterisk) is matched
          // console.log(`Asterisk: ${match[3]}`);
        } else {
          const serverName = match[1];
          const ipAddress = match[2];

          if(ipAddress == ip){
            continue;
          }

          path.push({
            name: serverName,
            ip: ipAddress,
            hop,
          });
        }
      }
    });

    child.on('close', (code) => {
      if (code == 0) {
        // this.networkGraph.printUserNodeMap();
        resolve(path)
      } else {
        reject(new Error(`child process exited with code ${code}`));
      }
    });
  });
}
