let users = {};
let serverInfo = {};
let seenNodes = {};

socket = io();
socket.on('connect', () => {
  console.log('connected');
});

socket.on('position-update', (update) => {
  users = update.users;
  serverInfo = update.serverInfo;
  seenNodes = update.seenNodes;
});

function sendMousePositionToServer() {
  socket.emit('mouse-update', {
    x: mouseX,
    y: mouseY,
    screenX: window.innerWidth,
    screenY: window.innerHeight
  });
}

function setup() {
  console.log("testing setup");
  createCanvas(window.innerWidth, window.innerHeight);
}

function draw() {
  background(0);
  fill(255);

  if(frameCount % 2 == 0) {
    sendMousePositionToServer();
  }
  
  if(users != undefined) {
    for (const [key, value] of Object.entries(users)) {
      let x_pos = window.innerWidth * (value.x / value.screenX);
      let y_pos = window.innerHeight * (value.y / value.screenY);

      push();
      noStroke();
      fill(255);
      textSize(18);
      text(key + "-" + value.ip, x_pos, y_pos);
      pop();

      push();
      stroke(200);
      line(width/2, height/2, x_pos, y_pos);
      pop();

      push();
      textAlign(RIGHT);
      text(`(${x_pos.toFixed(4)},${y_pos.toFixed(4)})`, x_pos-8, y_pos);
      pop();

      if(value.traceroute_path != undefined) {
        // List out the traceroute path
        let connectionFound = false;
        for(let i=0; i<value.traceroute_path.length; i++) {
          push();
          textSize(8);
          noStroke();
          fill(200);
          text(`[${value.traceroute_path[i].hop}] :: ${value.traceroute_path[i].name} - (${value.traceroute_path[i].ip})`, x_pos, y_pos+((i+1)*14));
          pop();

          if(!connectionFound) {
            let connected_users = seenNodes[value.traceroute_path[i].ip];
            if(connected_users.length > 1) {
              push();
              fill(255, 0, 0);
              ellipse(x_pos, y_pos+((i+1)*14), 10, 10);
              pop();
              connectionFound = true;
            }
          }
        }
      }
    }
  }

  push();
  textAlign(CENTER);
  stroke(255);
  strokeWeight(20);
  textSize(16);
  fill(0);
  text(
    serverInfo.name || "server",
    width/2,
    height/2+8);
  pop();
}
