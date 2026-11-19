(function () {
  "use strict";

  const canvas = document.getElementById("arena");
  const messageNode = document.getElementById("message");
  const enemyAlert = document.getElementById("enemy-alert");
  const batteryNode = document.getElementById("battery");
  const healthNode = document.getElementById("health");
  const fusesNode = document.getElementById("fuses");
  const recordNode = document.getElementById("record");
  const turnNode = document.getElementById("turn");
  const ammoNode = document.getElementById("ammo");

  const TILE = 2.4;
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  const walls = [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7e7cf);
  scene.fog = new THREE.FogExp2(0xf7e7cf, 0.008);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 100);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.AmbientLight(0xffe8d6, 0.55));
  scene.add(new THREE.HemisphereLight(0xffeedd, 0x1e1e28, 0.4));

  const player = {
    x: 1.5 * TILE,
    z: 1.5 * TILE,
    y: 1.68,
    yaw: 0,
    targetYaw: 0,
    pitch: 0,
    targetPitch: 0,
    radius: 0.55,
    stamina: 100,
    health: 100
  };

  const exitPos = { x: 13 * TILE, z: 13 * TILE };
  const batteryPickups = [];
  const ammoPickups = [];
  const fusePickups = [];
  const enemies = [];
  let isGameOver = false;

  function canvasTexture(size, painter) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    painter(canvas.getContext("2d"), size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  const checkerTexture = canvasTexture(128, function (ctx, size) {
    const cell = size / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#f7f1df" : "#17191d";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  });
  checkerTexture.repeat.set(18, 18);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(map[0].length * TILE, map.length * TILE),
    new THREE.MeshStandardMaterial({ map: checkerTexture, roughness: 0.72 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((map[0].length - 1) * TILE / 2, 0, (map.length - 1) * TILE / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const wallTexture = canvasTexture(128, function (ctx, size) {
    ctx.fillStyle = "#f5ead4";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = "#d84a47";
      ctx.fillRect(0, y, size, 16);
      ctx.fillStyle = "#fff6e6";
      ctx.fillRect(0, y + 16, size, 16);
    }
  });
  wallTexture.repeat.set(2, 1);

  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.82 });
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 1) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 3.3, TILE), wallMaterial);
        wall.position.set(c * TILE, 1.65, r * TILE);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push({ x: c * TILE, z: r * TILE, half: TILE / 2, height: 3.3 });
      }
    }
  }

  function addPoster(text, x, z, rotation) {
    const posterCanvas = document.createElement("canvas");
    posterCanvas.width = 256;
    posterCanvas.height = 160;
    const ctx = posterCanvas.getContext("2d");
    ctx.fillStyle = "#f6d99b";
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = text === "PIZZA" ? "#e63946" : "#3b82f6";
    ctx.font = "bold 38px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 86);
    ctx.fillStyle = "#5a3422";
    ctx.fillRect(18, 118, 220, 8);
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.38),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(posterCanvas), side: THREE.DoubleSide })
    );
    poster.position.set(x, 2.2, z);
    poster.rotation.y = rotation;
    scene.add(poster);
  }
  addPoster("PIZZA", 3 * TILE, 0.02, 0);
  addPoster("SHOWTIME", 10 * TILE, (map.length - 1) * TILE - 0.02, Math.PI);

  function addCeilingLight(x, z) {
    const fixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff1b5, emissive: 0xffcf66, emissiveIntensity: 1.8 })
    );
    fixture.position.set(x, 3.15, z);
    scene.add(fixture);
    const light = new THREE.PointLight(0xffd9a3, 0.65, 8.5, 2);
    light.position.set(x, 3, z);
    light.castShadow = false;
    scene.add(light);
  }
  [[2,2],[6,2],[10,2],[3,6],[8,6],[12,6],[3,10],[7,10],[12,10],[13,13],[6,13]].forEach(function (p) {
    addCeilingLight(p[0] * TILE, p[1] * TILE);
  });

  function addPartyTable(x, z) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4d66, roughness: 0.58 })
    );
    top.position.y = 1;
    group.add(top);
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b7280 })
      );
      const angle = i * Math.PI / 2;
      leg.position.set(Math.cos(angle) * 0.48, 0.5, Math.sin(angle) * 0.48);
      group.add(leg);
    }
    const pizza = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.04, 18),
      new THREE.MeshStandardMaterial({ color: 0xe6a64a })
    );
    pizza.position.y = 1.12;
    group.add(pizza);
    group.position.set(x, 0, z);
    scene.add(group);
  }
  [[4,3],[8,4],[11,8],[5,11],[9,12],[12,3]].forEach(function (p) {
    addPartyTable(p[0] * TILE, p[1] * TILE);
  });

  function addBanner() {
    const colors = [0xe11d48, 0xfacc15, 0x2563eb, 0x22c55e];
    for (let i = 0; i < 14; i++) {
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.45, 3),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide })
      );
      flag.position.set(i * TILE * 0.7 + TILE, 2.75, i % 2 ? 5 * TILE : 5.5 * TILE);
      flag.rotation.z = Math.PI;
      scene.add(flag);
    }
  }
  addBanner();

  const exitDoor = new THREE.Mesh(
    new THREE.BoxGeometry(TILE, 2.8, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x3a0808 })
  );
  exitDoor.position.set(exitPos.x, 1.4, exitPos.z);
  scene.add(exitDoor);

  const exitLight = new THREE.PointLight(0xf87171, 2.1, 7);
  exitLight.position.set(exitPos.x, 2.8, exitPos.z - 0.6);
  scene.add(exitLight);

  const flashlight = new THREE.SpotLight(0xfff2c8, 4.8, 22, Math.PI / 7, 0.55, 1.2);
  flashlight.position.set(player.x, player.y, player.z);
  flashlight.castShadow = true;
  scene.add(flashlight);
  scene.add(flashlight.target);

  function boxMesh(width, height, depth, color, emissive) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color: color, emissive: emissive || 0x000000, roughness: 0.58 })
    );
    mesh.castShadow = true;
    return mesh;
  }

  function buildAnimatronic(skin) {
    const group = new THREE.Group();
    const colors = {
      freddy: { body: 0x7a4a24, accent: 0x171717, eye: 0x63d9ff },
      bonnie: { body: 0x6d5d9c, accent: 0xe11d48, eye: 0xe879f9 },
      chica: { body: 0xf3c623, accent: 0xffa928, eye: 0x67e8f9 },
      foxy: { body: 0xb62b2b, accent: 0x6b7280, eye: 0xffd84d },
      springtrap: { body: 0x9b9347, accent: 0x552455, eye: 0xeef7ff }
    };
    const c = colors[skin];
    const torso = boxMesh(1.15, 1.45, 0.72, c.body);
    torso.position.y = 1.55;
    group.add(torso);

    const head = boxMesh(1.05, 0.82, 0.82, c.body);
    head.position.y = 2.62;
    group.add(head);
    const muzzle = boxMesh(0.68, 0.38, 0.18, skin === "chica" ? 0xffd36a : 0x9a7658);
    muzzle.position.set(0, 2.48, 0.47);
    group.add(muzzle);

    const jaw = new THREE.Group();
    jaw.position.set(0, 2.28, 0.47);
    const jawPlate = boxMesh(0.64, 0.16, 0.12, 0x5a3c2c);
    jaw.add(jawPlate);
    group.add(jaw);

    const eyeMeshes = [];
    [-0.5, 0.5].forEach(function (x) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        new THREE.MeshBasicMaterial({ color: c.eye })
      );
      eye.position.set(x * 0.58, 2.73, 0.43);
      eye.userData.normalColor = c.eye;
      group.add(eye);
      eyeMeshes.push(eye);
    });

    function limb(width, height, depth, x, y, z) {
      const part = boxMesh(width, height, depth, c.body);
      part.position.set(x, y, z);
      group.add(part);
      return part;
    }
    const armL = limb(0.28, 1.25, 0.28, -0.78, 1.38, 0);
    const armR = limb(0.28, 1.25, 0.28, 0.78, 1.38, 0);
    const legL = limb(0.34, 0.95, 0.34, -0.34, 0.48, 0);
    const legR = limb(0.34, 0.95, 0.34, 0.34, 0.48, 0);
    group.userData.parts = { armL: armL, armR: armR, legL: legL, legR: legR, jaw: jaw, eyes: eyeMeshes };

    if (skin === "freddy") {
      const hatTop = boxMesh(0.72, 0.18, 0.72, 0x151515);
      hatTop.position.set(0, 3.18, 0);
      group.add(hatTop);
      const hat = boxMesh(0.52, 0.5, 0.52, 0x151515);
      hat.position.set(0, 3.02, 0);
      group.add(hat);
      const bow = boxMesh(0.48, 0.12, 0.16, c.accent);
      bow.position.set(0, 1.95, 0.38);
      group.add(bow);
      const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 8), new THREE.MeshStandardMaterial({color:0x252525}));
      mic.position.set(0.87, 1.05, 0.42);
      mic.rotation.z = -0.45;
      group.add(mic);
    }

    if (skin === "bonnie") {
      [-0.34, 0.34].forEach(function (x) {
        const ear = boxMesh(0.22, 1.25, 0.22, c.body);
        ear.position.set(x, 3.55, 0);
        ear.rotation.z = x > 0 ? -0.12 : 0.12;
        group.add(ear);
      });
      const bow = boxMesh(0.42, 0.13, 0.16, c.accent);
      bow.position.set(0, 1.92, 0.38);
      group.add(bow);
      const guitar = boxMesh(0.72, 0.38, 0.12, c.accent);
      guitar.position.set(0.9, 1.5, 0.35);
      guitar.rotation.z = -0.35;
      group.add(guitar);
    }

    if (skin === "chica") {
      const bib = boxMesh(0.72, 0.68, 0.08, 0xffffff);
      bib.position.set(0, 1.58, 0.38);
      group.add(bib);
      const beak = boxMesh(0.42, 0.22, 0.24, c.accent);
      beak.position.set(0, 2.43, 0.58);
      group.add(beak);
      const cupcake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.18, 0.32, 10),
        new THREE.MeshStandardMaterial({ color: 0xf472b6 })
      );
      cupcake.position.set(0.93, 1.05, 0.38);
      group.add(cupcake);
    }

    if (skin === "foxy") {
      [-0.36, 0.36].forEach(function (x) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.72, 8), new THREE.MeshStandardMaterial({color:c.body}));
        ear.position.set(x, 3.38, 0);
        group.add(ear);
      });
      const patch = boxMesh(0.32, 0.32, 0.04, 0x202020);
      patch.position.set(-0.3, 2.72, 0.43);
      group.add(patch);
      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.07, 8, 12, Math.PI * 1.2),
        new THREE.MeshStandardMaterial({ color: 0xbfc5ca, metalness: 0.75, roughness: 0.25 })
      );
      hook.position.set(0.88, 0.62, 0.28);
      hook.rotation.z = -0.5;
      group.add(hook);
      group.rotation.z = -0.08;
    }

    if (skin === "springtrap") {
      [-0.38, 0.38].forEach(function (x) {
        const ear = boxMesh(0.18, 1.18, 0.18, c.body);
        ear.position.set(x, 3.48, 0);
        ear.rotation.z = x > 0 ? -0.24 : 0.08;
        group.add(ear);
      });
      const bow = boxMesh(0.48, 0.16, 0.16, c.accent);
      bow.position.set(0, 1.92, 0.38);
      group.add(bow);
      [-0.38, 0.38].forEach(function (x) {
        const damage = boxMesh(0.12, 0.55, 0.08, 0x282828);
        damage.position.set(x, 1.48, 0.37);
        damage.rotation.z = x > 0 ? 0.18 : -0.18;
        group.add(damage);
      });
    }

    group.scale.setScalar(0.78);
    return group;
  }

  const enemyData = [
    { skin: "freddy", x: 11 * TILE, z: 3 * TILE, targetX: 11 * TILE, targetZ: 3 * TILE },
    { skin: "bonnie", x: 3 * TILE, z: 9 * TILE, targetX: 3 * TILE, targetZ: 9 * TILE },
    { skin: "chica", x: 11 * TILE, z: 11 * TILE, targetX: 11 * TILE, targetZ: 11 * TILE },
    { skin: "foxy", x: 13 * TILE, z: 1 * TILE, targetX: 13 * TILE, targetZ: 1 * TILE },
    { skin: "springtrap", x: 12 * TILE, z: 13 * TILE, targetX: 12 * TILE, targetZ: 13 * TILE }
  ];
  enemyData.forEach(function (data) {
    data.group = buildAnimatronic(data.skin);
    data.group.position.set(data.x, 0, data.z);
    scene.add(data.group);
    enemies.push(data);
  });

  function worldToTile(x, z) {
    return { c: Math.round(x / TILE), r: Math.round(z / TILE) };
  }

  function canOccupy(x, z, radius) {
    if (x < TILE * 0.5 || z < TILE * 0.5 ||
        x > (map[0].length - 1.5) * TILE ||
        z > (map.length - 1.5) * TILE) return false;
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const cx = Math.max(wall.x - wall.half, Math.min(x, wall.x + wall.half));
      const cz = Math.max(wall.z - wall.half, Math.min(z, wall.z + wall.half));
      if (Math.hypot(x - cx, z - cz) < radius) return false;
    }
    return true;
  }

  function chooseNextTile(enemy) {
    const tile = worldToTile(enemy.x, enemy.z);
    const dirs = [{dc:1,dr:0},{dc:-1,dr:0},{dc:0,dr:1},{dc:0,dr:-1}];
    const valid = dirs.filter(function (d) {
      const r = tile.r + d.dr, c = tile.c + d.dc;
      return map[r] && map[r][c] !== undefined && map[r][c] !== 1 && map[r][c] !== 4;
    });
    if (!valid.length) return;

    let chosen = valid[Math.floor(Math.random() * valid.length)];
    let best = Infinity;
    valid.forEach(function (d) {
      const tx = (tile.c + d.dc) * TILE;
      const tz = (tile.r + d.dr) * TILE;
      if (!canOccupy(tx, tz, 0.5)) return;
      const dist = Math.hypot(player.x - tx, player.z - tz);
      if (dist < best) { best = dist; chosen = d; }
    });
    enemy.targetX = (tile.c + chosen.dc) * TILE;
    enemy.targetZ = (tile.r + chosen.dr) * TILE;
  }
  enemies.forEach(chooseNextTile);

  let battery = 100;
  let health = 100;
  let fusesCollected = 0;
  let score = 0;
  let magazine = 12;
  let reserveAmmo = 24;
  let canShoot = true;
  let isSprinting = false;
  const controls = Object.create(null);
  const keys = Object.create(null);

  function isPressed(name) { return Boolean(keys[name] || controls[name]); }

  function addPickup(type, x, z) {
    let mesh;
    if (type === "fuse") {
      mesh = boxMesh(0.22, 0.55, 0.22, 0x38bdf8, 0x075985);
    } else if (type === "battery") {
      mesh = boxMesh(0.42, 0.24, 0.22, 0x22c55e, 0x14532d);
    } else {
      mesh = boxMesh(0.52, 0.24, 0.28, 0xd97706, 0x78350f);
    }
    mesh.position.set(x, 0.7, z);
    scene.add(mesh);
    const item = { mesh: mesh, type: type };
    if (type === "fuse") fusePickups.push(item);
    if (type === "battery") batteryPickups.push(item);
    if (type === "ammo") ammoPickups.push(item);
  }
  addPickup("fuse", 6 * TILE, 3 * TILE);
  addPickup("fuse", 12 * TILE, 7 * TILE);
  addPickup("fuse", 5 * TILE, 13 * TILE);
  [[2,6,"battery"],[10,5,"battery"],[9,13,"ammo"],[3,12,"ammo"],[12,9,"ammo"]].forEach(function (p) {
    addPickup(p[2], p[0] * TILE, p[1] * TILE);
  });

  window.addEventListener("keydown", function (event) {
    keys[event.code] = true;
  });
  window.addEventListener("keyup", function (event) {
    keys[event.code] = false;
  });
  window.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  const controlToggle = document.getElementById("control-toggle");
  const joystickBase = document.getElementById("joystick-base");
  const joystickStick = document.getElementById("joystick-stick");
  const dpad = document.getElementById("dpad");
  let controlMode = localStorage.getItem("juego3d-control") || "joystick";
  let joystickPointer = null;
  let joystickVector = { x: 0, y: 0 };

  function applyControlMode() {
    const joystick = controlMode === "joystick";
    joystickBase.style.display = joystick ? "block" : "none";
    dpad.classList.toggle("visible", !joystick);
    controlToggle.textContent = joystick ? "CONTROL: JOYSTICK" : "CONTROL: FLECHAS";
    controlToggle.setAttribute("aria-pressed", joystick ? "false" : "true");
    localStorage.setItem("juego3d-control", controlMode);
  }

  controlToggle.addEventListener("pointerdown", function (event) {
    event.preventEventDefault ? event.preventEventDefault() : event.preventDefault();
  });
  controlToggle.addEventListener("click", function () {
    controlMode = controlMode === "joystick" ? "arrows" : "joystick";
    applyControlMode();
  });
  applyControlMode();

  function updateJoystick(event) {
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const max = 44;
    const distance = Math.hypot(dx, dy);
    if (distance > max) {
      dx = dx / distance * max;
      dy = dy / distance * max;
    }
    joystickVector.x = dx / max;
    joystickVector.y = dy / max;
    joystickStick.style.transform = "translate(" + dx + "px," + dy + "px)";
  }

  joystickBase.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    joystickPointer = event.pointerId;
    joystickBase.setPointerCapture && joystickBase.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  joystickBase.addEventListener("pointermove", function (event) {
    if (joystickPointer !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(event);
  });
  ["pointerup","pointercancel","pointerleave"].forEach(function (type) {
    joystickBase.addEventListener(type, function (event) {
      if (joystickPointer !== event.pointerId) return;
      joystickPointer = null;
      joystickVector.x = 0;
      joystickVector.y = 0;
      joystickStick.style.transform = "translate(0px,0px)";
    });
  });

  document.querySelectorAll("[data-control]").forEach(function (button) {
    const control = button.dataset.control;
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      button.setPointerCapture && button.setPointerCapture(event.pointerId);
      controls[control] = true;
      button.classList.add("active");
    });
    ["pointerup","pointercancel","pointerleave"].forEach(function (type) {
      button.addEventListener(type, function (event) {
        event.preventDefault();
        controls[control] = false;
        button.classList.remove("active");
      });
    });
  });

  let flashlightOn = true;

  function reloadMagazine() {
    if (magazine >= 12 || reserveAmmo <= 0) return;
    const amount = Math.min(12 - magazine, reserveAmmo);
    magazine += amount;
    reserveAmmo -= amount;
    ammoNode.textContent = magazine + "/" + reserveAmmo;
    showNotice("Cargador recargado");
  }

  document.querySelectorAll("[data-action]").forEach(function (button) {
    const action = button.dataset.action;
    const runAction = function (event) {
      event.preventDefault();
      if (action === "shoot") fireEnemyShot();
      if (action === "reload") reloadMagazine();
      if (action === "flashlight") {
        flashlightOn = !flashlightOn;
        flashlight.intensity = flashlightOn ? 4.8 : 0;
        showNotice(flashlightOn ? "Linterna encendida" : "Linterna apagada");
      }
      if (action === "jump") {
        player.pitch = THREE.MathUtils.clamp(player.pitch - 0.02, -0.7, 0.7);
      }
      if (action === "sprint") {
        controls.sprint = true;
        button.classList.add("active");
      }
    };
    button.addEventListener("pointerdown", runAction);
    if (action === "sprint") {
      ["pointerup","pointercancel","pointerleave"].forEach(function (type) {
        button.addEventListener(type, function () {
          controls.sprint = false;
          button.classList.remove("active");
        });
      });
    }
  });

  let lookPointer = null;
  let lookX = 0, lookY = 0;
  canvas.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse") {
      canvas.setPointerCapture(event.pointerId);
      lookPointer = event.pointerId;
      lookX = event.clientX;
      lookY = event.clientY;
    } else if (lookPointer === null) {
      canvas.setPointerCapture(event.pointerId);
      lookPointer = event.pointerId;
      lookX = event.clientX;
      lookY = event.clientY;
    }
  });
  canvas.addEventListener("pointermove", function (event) {
    if (lookPointer !== event.pointerId) return;
    player.targetYaw -= (event.clientX - lookX) * 0.004;
    player.targetPitch = THREE.MathUtils.clamp(player.targetPitch - (event.clientY - lookY) * 0.0035, -0.7, 0.7);
    lookX = event.clientX;
    lookY = event.clientY;
  });
  ["pointerup","pointercancel"].forEach(function (type) {
    canvas.addEventListener(type, function (event) {
      if (lookPointer === event.pointerId) lookPointer = null;
    });
  });

  function showNotice(text) {
    messageNode.textContent = text;
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(function () { messageNode.textContent = ""; }, 2200);
  }

  function fireEnemyShot() {
    if (isGameOver || !canShoot) return;
    if (magazine <= 0) {
      if (reserveAmmo > 0) {
        const amount = Math.min(12 - magazine, reserveAmmo);
        magazine += amount;
        reserveAmmo -= amount;
      } else {
        showNotice("Sin munición");
        return;
      }
    }
    magazine--;
    canShoot = false;
    setTimeout(function () { canShoot = true; }, 260);
    ammoNode.textContent = magazine + "/" + reserveAmmo;

    const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
    let target = null;
    let nearest = 18;
    enemies.forEach(function (enemy) {
      const toEnemy = new THREE.Vector3(enemy.x - player.x, 0, enemy.z - player.z);
      const distance = toEnemy.length();
      if (distance >= nearest) return;
      const direction = toEnemy.normalize();
      if (lookDir.dot(direction) > 0.94) {
        target = enemy;
        nearest = distance;
      }
    });
    if (!target) {
      showNotice("Sin objetivo");
      return;
    }

    const knockback = new THREE.Vector3(target.x - player.x, 0, target.z - player.z).normalize();
    const nextX = target.x + knockback.x * 0.8;
    const nextZ = target.z + knockback.z * 0.8;
    if (canOccupy(nextX, target.z, 0.62)) target.x = nextX;
    if (canOccupy(target.x, nextZ, 0.62)) target.z = nextZ;
    target.group.position.set(target.x, 0, target.z);
    target.targetX = target.x;
    target.targetZ = target.z;
    score += 250;
    showNotice("Impacto confirmado");
  }

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  async function checkStatus() {
    try {
      const response = await fetch("/api/status");
      if (!response.ok) throw new Error("API unavailable");
      await response.json();
    } catch (error) {
      showNotice("API fuera de línea");
    }
  }
  checkStatus();

  const clock = new THREE.Clock();
  let elapsedSeconds = 0;

  function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.08);
    elapsedSeconds += dt;

    player.yaw += (player.targetYaw - player.yaw) * Math.min(1, 12 * dt);
    player.pitch += (player.targetPitch - player.pitch) * Math.min(1, 12 * dt);

    const movingInput = isPressed("KeyW") || isPressed("ArrowUp") || isPressed("forward") ||
      isPressed("KeyS") || isPressed("ArrowDown") || isPressed("back") ||
      isPressed("KeyA") || isPressed("ArrowLeft") || isPressed("left") ||
      isPressed("KeyD") || isPressed("ArrowRight") || isPressed("right");
    isSprinting = isPressed("ShiftLeft") || isPressed("ShiftRight") || isPressed("sprint");
    if (isSprinting && movingInput) player.stamina = Math.max(0, player.stamina - 24 * dt);
    else player.stamina = Math.min(100, player.stamina + 14 * dt);

    let forward = (isPressed("KeyW") || isPressed("ArrowUp") || isPressed("forward") ? 1 : 0)
      - (isPressed("KeyS") || isPressed("ArrowDown") || isPressed("back") ? 1 : 0);
    let lateral = (isPressed("KeyD") || isPressed("ArrowRight") || isPressed("right") ? 1 : 0)
      - (isPressed("KeyA") || isPressed("ArrowLeft") || isPressed("left") ? 1 : 0);
    if (controlMode === "joystick") {
      forward = THREE.MathUtils.clamp(forward - joystickVector.y, -1, 1);
      lateral = THREE.MathUtils.clamp(lateral + joystickVector.x, -1, 1);
      if (Math.abs(joystickVector.x) > 0.12) {
        player.targetYaw -= joystickVector.x * 0.018;
      }
    }
    const speed = (isSprinting && player.stamina > 2 ? 5.8 : 3.8) * dt;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    const dx = (fx * forward + rx * lateral) * speed;
    const dz = (fz * forward + rz * lateral) * speed;
    if (canOccupy(player.x + dx, player.z, player.radius)) player.x += dx;
    if (canOccupy(player.x, player.z + dz, player.radius)) player.z += dz;

    const bob = movingInput ? Math.sin(elapsedSeconds * (isSprinting ? 13 : 9)) * 0.045 : 0;
    camera.position.set(player.x, player.y + bob, player.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
    flashlight.position.copy(camera.position);
    flashlight.target.position.copy(camera.position).add(lookDir);
    flashlight.target.updateMatrixWorld();

    battery = Math.max(0, battery - dt * 0.32);
    batteryNode.textContent = Math.round(battery) + "%";
    fusesNode.textContent = fusesCollected + "/3";
    healthNode.textContent = Math.round(health) + "%";
    recordNode.textContent = score;
    ammoNode.textContent = magazine + "/" + reserveAmmo;
    turnNode.textContent = battery > 75 ? "12:00 AM" : battery > 50 ? "1:00 AM" : battery > 25 ? "3:00 AM" : "5:00 AM";

    for (let i = fusePickups.length - 1; i >= 0; i--) {
      const fuse = fusePickups[i];
      fuse.mesh.rotation.y += dt * 2;
      if (Math.hypot(player.x - fuse.mesh.position.x, player.z - fuse.mesh.position.z) < 1) {
        scene.remove(fuse.mesh);
        fusePickups.splice(i, 1);
        fusesCollected++;
        score += 500;
        if (fusesCollected === 3) {
          exitDoor.material.color.setHex(0x22c55e);
          exitDoor.material.emissive.setHex(0x14532d);
          exitLight.color.setHex(0x86efac);
          showNotice("Salida desbloqueada");
        } else showNotice("Fusible obtenido " + fusesCollected + "/3");
      }
    }

    for (let i = batteryPickups.length - 1; i >= 0; i--) {
      const pickup = batteryPickups[i];
      pickup.mesh.rotation.y += dt;
      if (Math.hypot(player.x - pickup.mesh.position.x, player.z - pickup.mesh.position.z) < 1) {
        scene.remove(pickup.mesh);
        batteryPickups.splice(i, 1);
        battery = Math.min(100, battery + 35);
        showNotice("Batería restaurada");
      }
    }
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
      const pickup = ammoPickups[i];
      pickup.mesh.rotation.y += dt;
      if (Math.hypot(player.x - pickup.mesh.position.x, player.z - pickup.mesh.position.z) < 1) {
        scene.remove(pickup.mesh);
        ammoPickups.splice(i, 1);
        score += 100;
        reserveAmmo = Math.min(48, reserveAmmo + 12);
        ammoNode.textContent = magazine + "/" + reserveAmmo;
        showNotice("Munición obtenida");
      }
    }

    let closestDistance = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const distance = Math.hypot(player.x - enemy.x, player.z - enemy.z);
      closestDistance = Math.min(closestDistance, distance);
      const dx = enemy.targetX - enemy.x;
      const dz = enemy.targetZ - enemy.z;
      const remaining = Math.hypot(dx, dz);
      if (remaining < 0.12) {
        enemy.x = enemy.targetX;
        enemy.z = enemy.targetZ;
        chooseNextTile(enemy);
      } else {
        const enemySpeed = (enemy.skin === "foxy" ? 2.4 : 1.7) * dt;
        const nx = enemy.x + (dx / remaining) * enemySpeed;
        const nz = enemy.z + (dz / remaining) * enemySpeed;
        if (Math.hypot(player.x - nx, player.z - enemy.z) >= 1.45 &&
            canOccupy(nx, enemy.z, 0.62)) enemy.x = nx;
        else if (Math.hypot(player.x - nx, player.z - enemy.z) < 1.45) {
          enemy.targetX = enemy.x;
          enemy.targetZ = enemy.z;
        } else chooseNextTile(enemy);
        if (Math.hypot(player.x - enemy.x, player.z - nz) >= 1.45 &&
            canOccupy(enemy.x, nz, 0.62)) enemy.z = nz;
        else if (Math.hypot(player.x - enemy.x, player.z - nz) < 1.45) {
          enemy.targetX = enemy.x;
          enemy.targetZ = enemy.z;
        } else chooseNextTile(enemy);
      }
      enemy.group.position.set(enemy.x, 0, enemy.z);
      enemy.group.rotation.y = Math.atan2(enemy.targetX - enemy.x, enemy.targetZ - enemy.z);
      const parts = enemy.group.userData.parts;
      const swing = Math.sin(elapsedSeconds * 7) * 0.35;
      parts.armL.rotation.x = swing;
      parts.armR.rotation.x = -swing;
      parts.legL.rotation.x = -swing;
      parts.legR.rotation.x = swing;
      if (parts.jaw) {
        parts.jaw.rotation.x = distance < 8 ? 0.18 + Math.sin(elapsedSeconds * 8) * 0.08 : 0;
      }
      if (parts.eyes) {
        parts.eyes.forEach(function (eye) {
          eye.material.color.setHex(distance < 8 ? 0xff1717 : eye.userData.normalColor);
        });
      }

      if (distance < 1.05) {
        health = Math.max(0, health - 18 * dt);
        enemyAlert.classList.add("visible");
        enemyAlert.textContent = enemy.skin.toUpperCase() + " está cerca";
      }
      if (distance < 0.72) {
        isGameOver = true;
        document.getElementById("gameover").style.display = "flex";
        return;
      }
    }
    if (closestDistance > 7) enemyAlert.classList.remove("visible");

    if (fusesCollected >= 3 && Math.hypot(player.x - exitPos.x, player.z - exitPos.z) < 1.8) {
      isGameOver = true;
      document.getElementById("victory").style.display = "flex";
    }

    renderer.render(scene, camera);
  }

  animate();
})();
