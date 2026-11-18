(function () {
  "use strict";

  const canvas = document.getElementById("arena");
  const scoreNode = document.getElementById("score");
  const statusNode = document.getElementById("status");
  const messageNode = document.getElementById("message");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090d18);
  scene.fog = new THREE.Fog(0x090d18, 18, 42);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene.add(new THREE.HemisphereLight(0xb9d8ff, 0x101020, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(8, 12, 6);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x151c30, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(40, 40, 0x35a7ff, 0x263350);
  scene.add(grid);

  const player = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x36d399, roughness: 0.35 })
  );
  player.position.set(0, 0.5, 6);
  scene.add(player);

  const keys = {};
  const controls = {};
  let verticalVelocity = 0;
  let grounded = true;
  let score = 0;
  let targets = [];

  function spawnTarget() {
    const target = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffb020,
        emissive: 0x8a4100,
        roughness: 0.25,
      })
    );
    target.position.set(
      THREE.MathUtils.randFloatSpread(28),
      0.7,
      THREE.MathUtils.randFloatSpread(28)
    );
    scene.add(target);
    targets.push(target);
  }

  for (let i = 0; i < 10; i += 1) spawnTarget();

  function isPressed(name) {
    return Boolean(keys[name] || controls[name]);
  }

  function move() {
    const speed = 7.5;
    const forward = (isPressed("KeyW") || isPressed("ArrowUp") || isPressed("forward") ? 1 : 0)
      - (isPressed("KeyS") || isPressed("ArrowDown") || isPressed("back") ? 1 : 0);
    const lateral = (isPressed("KeyD") || isPressed("ArrowRight") || isPressed("right") ? 1 : 0)
      - (isPressed("KeyA") || isPressed("ArrowLeft") || isPressed("left") ? 1 : 0);

    if (forward || lateral) {
      const length = Math.hypot(forward, lateral);
      player.position.x += (lateral / length) * speed * 0.016;
      player.position.z -= (forward / length) * speed * 0.016;
    }

    if ((isPressed("Space") || isPressed("jump")) && grounded) {
      verticalVelocity = 7;
      grounded = false;
    }

    verticalVelocity -= 18 * 0.016;
    player.position.y += verticalVelocity * 0.016;
    if (player.position.y <= 0.5) {
      player.position.y = 0.5;
      verticalVelocity = 0;
      grounded = true;
    }

    player.position.x = THREE.MathUtils.clamp(player.position.x, -19, 19);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -19, 19);
  }

  function collectTargets() {
    targets = targets.filter(function (target) {
      if (player.position.distanceTo(target.position) < 1.1) {
        scene.remove(target);
        score += 100;
        scoreNode.textContent = score;
        messageNode.textContent = "+100";
        setTimeout(function () { messageNode.textContent = ""; }, 500);
        spawnTarget();
        return false;
      }
      target.rotation.y += 0.03;
      target.position.y = 0.7 + Math.sin(Date.now() * 0.003 + target.position.x) * 0.12;
      return true;
    });
  }

  async function checkStatus() {
    try {
      const response = await fetch("/api/status");
      if (!response.ok) throw new Error("API no disponible");
      await response.json();
      statusNode.textContent = "Online";
    } catch (error) {
      statusNode.textContent = "Offline";
    }
  }

  window.addEventListener("keydown", function (event) {
    keys[event.code] = true;
  });
  window.addEventListener("keyup", function (event) {
    keys[event.code] = false;
  });

  document.querySelectorAll("[data-control]").forEach(function (button) {
    const control = button.dataset.control;
    const activate = function (event) {
      event.preventDefault();
      controls[control] = true;
    };
    const deactivate = function (event) {
      event.preventDefault();
      controls[control] = false;
    };
    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", deactivate);
    button.addEventListener("pointerleave", deactivate);
    button.addEventListener("pointercancel", deactivate);
  });

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    clock.getDelta();
    move();
    collectTargets();
    camera.position.lerp(
      new THREE.Vector3(player.position.x, player.position.y + 7, player.position.z + 11),
      0.08
    );
    camera.lookAt(player.position);
    renderer.render(scene, camera);
  }

  checkStatus();
  setInterval(checkStatus, 10000);
  animate();
})();
