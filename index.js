const express = require("express");
const http = require('http');
const path = require('path');
const { spawn } = require('child_process')

const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let users = {} // current users connected to site
let serverInfo = {}; // info on the server (name, ip, ...)
let seenNodes = {}; // nodes seen by the server, used to create connections

getHostIdentifier().then(hostIdentifier => {
  serverInfo['name'] = hostIdentifier;
}).catch(error => console.log(error));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './index.html'));
});

// Runs when a new client connects to the server
io.on('connection', async (socket) => {
  // console.log('client connected');
  let socket_identifier = (Math.random() + 1).toString(36).substring(7) // Random string to identify the user
  let socket_ip = socket.conn.remoteAddress.split(":")[3] || "8.8.8.8"; // Default to 8.8.8.8 if no IP is found

  users[socket_identifier] = {
    x: Math.random() * 400,
    y: Math.random() * 400,
    ip: socket_ip
  }

  traceIPRoute(socket_identifier, socket_ip).then(traceroute_path => {
    users[socket_identifier]['traceroute_path'] = traceroute_path;
    // console.log("Users", users);
  }).catch(err => {
    console.log(err);
  });

  socket.on('mouse-update', (mouse_position) => {
    users[socket_identifier].x = mouse_position.x
    users[socket_identifier].y = mouse_position.y
    users[socket_identifier].screenY = mouse_position.screenY
    users[socket_identifier].screenX = mouse_position.screenX
  });

  socket.on('disconnect', () => {
    // console.log('a user disconnected');
    let leaving_user = users[socket_identifier];
    if(leaving_user.traceroute_path !== undefined) {
      for(let i=0; i<leaving_user.traceroute_path.length; i++){
        let nodeToDeleteFrom = seenNodes[leaving_user.traceroute_path[i].ip];
        // console.log("Node to delete from:", nodeToDeleteFrom)
        // console.log("Leaving user:", socket_identifier)
        // console.log(`Leaving user traceroute hop ${leaving_user.traceroute_path[i].hop}:`, leaving_user.traceroute_path[i])
        let index = nodeToDeleteFrom.findIndex((element) => {
          return element.socket_id == socket_identifier;
        });
        if(index > -1){
          seenNodes[leaving_user.traceroute_path[i].ip].splice(index, 1);
        }
      }
    }
    // console.log("seenNodes:", seenNodes)
    delete users[socket_identifier];
  });

});

setInterval(function() {
  io.emit('position-update', {
    users,
    serverInfo,
    seenNodes,
  });
}, 10);

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});


function getHostIdentifier() {
  const { exec } = require('child_process');

  // Swap the following lines if running on mac vs linux
  //const command = 'hostname -I';
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

async function traceIPRoute(socket_id, ip) {
  return new Promise((resolve, reject) => {
    let traceroute_path = [];
    let hop = 0;

    const child = spawn('traceroute', ['-q', '1', ip]);

    // The following regex gets each servername/ip pair from the traceroute output
    const regex = /(\S+)\s+\((\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b)\)|(\*)/g;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      for (const match of chunk.toString().matchAll(regex)) {
        hop += 1;
        if (match[3]) { // This catches the "******" case when a route's info can't be found
        } else {
          const serverName = match[1];
          const ipAddress = match[2];

          if(ipAddress == ip){
            continue;
          }

          traceroute_path.push({
            name: serverName,
            ip: ipAddress,
            hop,
          });

          // you can probably rewrite this to be cleaner
          if (seenNodes[ipAddress] == undefined) {
            seenNodes[ipAddress] = [{socket_id, ip}];
          } else {
            // console.log(`Adding ${socket_id}:${ip} to ${ipAddress}:${seenNodes[ipAddress]}`);
            seenNodes[ipAddress].push({socket_id, ip});
          }
        }
      }
    });

    child.on('close', (code) => {
      if (code == 0) {
        // console.log('closing traceroute');
        // console.log('seen nodes: ', seenNodes);
        resolve(traceroute_path);
      } else {
        reject(new Error(`child process exited with code ${code}`));
      }
    });
  });
}
