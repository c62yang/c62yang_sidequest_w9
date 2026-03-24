/*
  Week 9 — Example 3: Adding Sound, Music, and Debug Screen

  Controls:
    A or Left Arrow      Move left
    D or Right Arrow     Move right
    W or Up Arrow        Jump
    Space                Attack

  Debug Controls:
    G                    Toggle moon gravity
    H                    Toggle hitboxes / sensor
    R                    Reset player position
*/

let player;
let sensor;

let playerImg, bgImg;
let jumpSfx, musicSfx;
let musicStarted = false;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep;
let groundImg, groundDeepImg;

let attacking = false;
let attackFrameCounter = 0;

// --- TILE MAP ---
let level = [
  "              ",
  "              ",
  "              ",
  "              ",
  "              ",
  "       ggg    ",
  "gggggggggggggg",
  "dddddddddddddd",
];

// --- LEVEL CONSTANTS ---
const VIEWW = 320;
const VIEWH = 180;

const TILE_W = 24;
const TILE_H = 24;

const FRAME_W = 32;
const FRAME_H = 32;

const MAP_START_X = FRAME_W;
const MAP_START_Y = VIEWH - TILE_H * 4;

// --- GRAVITY ---
const NORMAL_GRAVITY = 10;
const MOON_GRAVITY = 1.6;

// --- DEBUG STATE ---
let debugMode = {
  moonGravity: false,
  showHitboxes: false,
};

function preload() {
  // --- IMAGES ---
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  // --- SOUND ---
  if (typeof loadSound === "function") {
    jumpSfx = loadSound("assets/sfx/jump.wav");
    musicSfx = loadSound("assets/sfx/music.wav");
  }
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;

  world.gravity.y = NORMAL_GRAVITY;

  if (musicSfx) musicSfx.setLoop(true);
  startMusicIfNeeded();

  // --- TILE GROUPS ---
  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  new Tiles(level, 0, 0, TILE_W, TILE_H);

  // --- PLAYER ---
  player = new Sprite(MAP_START_X, MAP_START_Y, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;

  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4;
  player.addAnis(playerAnis);
  player.ani = "idle";

  player.w = 18;
  player.h = 20;
  player.friction = 0;
  player.bounciness = 0;

  // --- GROUND SENSOR ---
  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;

  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;
}

function startMusicIfNeeded() {
  if (musicStarted || !musicSfx) return;

  const startLoop = () => {
    if (!musicSfx.isPlaying()) musicSfx.play();
    musicStarted = musicSfx.isPlaying();
  };

  const maybePromise = userStartAudio();
  if (maybePromise && typeof maybePromise.then === "function") {
    maybePromise.then(startLoop).catch(() => {});
  } else {
    startLoop();
  }
}

function keyPressed() {
  startMusicIfNeeded();

  // --- DEBUG TOGGLES ---
  if (key === "g" || key === "G") {
    debugMode.moonGravity = !debugMode.moonGravity;
    world.gravity.y = debugMode.moonGravity ? MOON_GRAVITY : NORMAL_GRAVITY;
  }

  if (key === "h" || key === "H") {
    debugMode.showHitboxes = !debugMode.showHitboxes;
    sensor.visible = debugMode.showHitboxes;
  }

  if (key === "r" || key === "R") {
    resetPlayer();
  }
}

function mousePressed() {
  startMusicIfNeeded();
}

function touchStarted() {
  startMusicIfNeeded();
  return false;
}

function resetPlayer() {
  player.x = MAP_START_X;
  player.y = MAP_START_Y;
  player.vel.x = 0;
  player.vel.y = 0;
  attacking = false;
  attackFrameCounter = 0;
  player.ani = "idle";
}

function draw() {
  // --- BACKGROUND ---
  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, bgImg.width, bgImg.height);

  drawDebugPanel();
  camera.on();

  // --- PLAYER STATE ---
  let grounded = sensor.overlapping(ground);

  // --- ATTACK INPUT ---
  if (grounded && !attacking && kb.presses("space")) {
    attacking = true;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play();
  }

  // --- JUMP ---
  if (grounded && kb.presses("up")) {
    player.vel.y = debugMode.moonGravity ? -2.7 : -4;
    if (jumpSfx) jumpSfx.play();
  }

  // --- STATE MACHINE ---
  if (attacking) {
    attackFrameCounter++;
    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
    }
  } else if (!grounded) {
    player.ani = "jump";
    player.ani.frame = player.vel.y < 0 ? 0 : 1;
  } else {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  // --- MOVEMENT ---
  if (!attacking) {
    player.vel.x = 0;

    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;
    }
  }

  // --- KEEP PLAYER IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // --- DEBUG VISUALS ---
  if (debugMode.showHitboxes) {
    drawHitbox(player, color(0, 255, 0));
    drawHitbox(sensor, color(255, 0, 0));
  }
}

function drawDebugPanel() {
  push();

  noStroke();
  fill(0, 180);
  rect(8, 8, 135, 72, 6);

  fill(255);
  textSize(10);
  textAlign(LEFT, TOP);

  text("DEBUG PANEL", 14, 14);
  text("Gravity: " + nf(world.gravity.y, 1, 1), 14, 28);
  text("Moon Gravity: " + (debugMode.moonGravity ? "ON" : "OFF"), 14, 40);
  text("Hitboxes: " + (debugMode.showHitboxes ? "ON" : "OFF"), 14, 52);
  text("R = Reset Player", 14, 64);

  pop();
}

function drawHitbox(sprite, c) {
  push();
  camera.off();

  noFill();
  stroke(c);
  strokeWeight(1);
  rectMode(CENTER);
  rect(sprite.x, sprite.y, sprite.w, sprite.h);

  camera.on();
  pop();
}