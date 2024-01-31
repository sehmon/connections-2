let users = {};
let serverInfo = {};

socket = io();
socket.on('connect', () => {
  console.log('connected');
});

socket.on('position-update', (update) => {
  users = update.users;
  serverInfo = update.serverInfo;
});

function sendMousePositionToServer() {
  socket.emit('mouse-update', {
    x: mouseX,
    y: mouseY
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
      stroke(255);
      textSize(24);
      text(key + "-" + value.ip, value.x, value.y);
      line(width/2, height/2, value.x, value.y);
    }
  }

  ellipse(width/2, height/2, 80);
  push();
  textAlign(CENTER);
  stroke(255);
  textSize(16);
  fill(0);
  text(
    serverInfo.name || "server",
    width/2,
    height/2+8);
  pop();
}
