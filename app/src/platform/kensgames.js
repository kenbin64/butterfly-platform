/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KENSGAMES — Manifold-Native Gaming Platform
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * All state managed via manifold-native LobbyManifold and GameRegistry.
 * No DiamondDrill, no GameManifold, no data drift.
 * State is PathExpr addresses — values discovered via z-invocation.
 *
 * Stack:
 *   KensGames (UI controller)
 *     ↓
 *   LobbyManifold + GameRegistry (RepresentationTables)
 *     ↓
 *   RepresentationTable (addresses, not bytes)
 *     ↓
 *   PathExpressions → Manifold (z = x·y)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const KensGames = {
  player: null,
  selectedGame: null,
  currentRoom: null,

  AVATARS: ["👤", "😎", "🎮", "🎲", "🚀", "⚡", "🔥", "💎", "🌟", "🎯", "👾", "🤖"],

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════
  init() {
    LobbyManifold.init();

    this.initBackground();
    this.initAvatarPicker();
    this.loadGames();

    // Try to load saved profile
    const saved = LobbyManifold.loadProfile();
    if (saved) {
      this.player = saved;
      document.getElementById("username-input").value = saved.username;
      this.selectAvatar(saved.avatarId);
    }

    console.log("KensGames initialized (manifold-native).");
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3D MANIFOLD BACKGROUND — Three.js saddle mesh + particle flow
  // ═══════════════════════════════════════════════════════════════════════
  _bg: null,

  initBackground() {
    const container = document.getElementById("three-bg");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030008, 1);
    container.appendChild(renderer.domElement);

    // ─── Saddle surface z = x·y ───
    const S = 40; // segments
    const saddleGeo = new THREE.BufferGeometry();
    const verts = [], normals = [], uvs = [], indices = [];
    const W = 16, D = 16, C = 0.08;
    for (let j = 0; j <= S; j++) {
      for (let i = 0; i <= S; i++) {
        const u = i / S, v = j / S;
        const x = (u - 0.5) * W, z = (v - 0.5) * D;
        const y = x * z * C;
        verts.push(x, y, z);
        const nx = -z * C, ny = 1, nz = -x * C;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
        normals.push(nx/len, ny/len, nz/len);
        uvs.push(u, v);
      }
    }
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const a = j*(S+1)+i, b = a+1, c = a+S+1, d = c+1;
        indices.push(a,b,d, a,d,c);
      }
    }
    saddleGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    saddleGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    saddleGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    saddleGeo.setIndex(indices);

    const saddleMat = new THREE.MeshPhongMaterial({
      color: 0x1a0033, emissive: 0x0a0020,
      wireframe: true, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const saddleMesh = new THREE.Mesh(saddleGeo, saddleMat);
    scene.add(saddleMesh);

    // ─── Neon grid floor ───
    const gridHelper = new THREE.GridHelper(20, 20, 0xb24dff, 0x1a0a2a);
    gridHelper.position.y = -3;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // ─── Particle flow along saddle gradients ───
    const PCOUNT = 300;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(PCOUNT * 3);
    const pColors = new Float32Array(PCOUNT * 3);
    const NEON = [
      [1, 0.18, 0.58],  // pink
      [0, 0.83, 1],     // cyan
      [0.7, 0.3, 1],    // purple
      [0.22, 1, 0.08],  // green
    ];
    const pVelocities = [];
    for (let i = 0; i < PCOUNT; i++) {
      pPositions[i*3]   = (Math.random() - 0.5) * 14;
      pPositions[i*3+1] = (Math.random() - 0.5) * 6;
      pPositions[i*3+2] = (Math.random() - 0.5) * 14;
      const nc = NEON[i % NEON.length];
      pColors[i*3] = nc[0]; pColors[i*3+1] = nc[1]; pColors[i*3+2] = nc[2];
      pVelocities.push({
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.01,
        vz: (Math.random() - 0.5) * 0.02,
      });
    }
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const particleSystem = new THREE.Points(pGeo, pMat);
    scene.add(particleSystem);

    // ─── Lights ───
    scene.add(new THREE.AmbientLight(0x1a0033, 0.5));
    const pinkLight = new THREE.PointLight(0xff2d95, 1.5, 30);
    pinkLight.position.set(-6, 5, 4);
    scene.add(pinkLight);
    const cyanLight = new THREE.PointLight(0x00d4ff, 1.5, 30);
    cyanLight.position.set(6, 5, -4);
    scene.add(cyanLight);

    this._bg = { scene, camera, renderer, saddleMesh, particleSystem, pPositions, pVelocities, pGeo };

    let t = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      t += 0.003;

      // Slowly rotate saddle
      saddleMesh.rotation.y = t * 0.15;
      saddleMesh.rotation.x = Math.sin(t * 0.5) * 0.1;

      // Animate particles along saddle gradients
      for (let i = 0; i < PCOUNT; i++) {
        const px = pPositions[i*3], py = pPositions[i*3+1], pz = pPositions[i*3+2];
        const v = pVelocities[i];
        // Saddle gradient: dz/dx = y, dz/dy = x → flow along gradient
        v.vx += pz * 0.0001;
        v.vz += px * 0.0001;
        v.vy -= 0.00005; // slight downward drift
        pPositions[i*3]   += v.vx;
        pPositions[i*3+1] += v.vy;
        pPositions[i*3+2] += v.vz;
        // Respawn if out of bounds
        if (Math.abs(pPositions[i*3]) > 8 || Math.abs(pPositions[i*3+1]) > 5 || Math.abs(pPositions[i*3+2]) > 8) {
          pPositions[i*3]   = (Math.random() - 0.5) * 10;
          pPositions[i*3+1] = (Math.random() - 0.5) * 4;
          pPositions[i*3+2] = (Math.random() - 0.5) * 10;
          v.vx = (Math.random() - 0.5) * 0.02;
          v.vy = (Math.random() - 0.5) * 0.01;
          v.vz = (Math.random() - 0.5) * 0.02;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Orbit camera gently
      camera.position.x = Math.sin(t * 0.2) * 3;
      camera.position.y = 4 + Math.sin(t * 0.3) * 1.5;
      camera.lookAt(0, 0, 0);

      // Pulse lights
      pinkLight.intensity = 1.2 + Math.sin(t * 2) * 0.5;
      cyanLight.intensity = 1.2 + Math.cos(t * 2) * 0.5;

      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUTH / PROFILE
  // ═══════════════════════════════════════════════════════════════════════
  initAvatarPicker() {
    const grid = document.getElementById("avatar-grid");
    grid.innerHTML = this.AVATARS.map((av, i) =>
      `<div class="avatar-option${i === 0 ? " selected" : ""}" data-avatar="${av}" onclick="KensGames.selectAvatar('${av}')">${av}</div>`
    ).join("");
  },

  selectAvatar(avatar) {
    document.querySelectorAll(".avatar-option").forEach(el => {
      el.classList.toggle("selected", el.dataset.avatar === avatar);
    });
  },

  getSelectedAvatar() {
    return document.querySelector(".avatar-option.selected")?.dataset.avatar || "👤";
  },

  enterPlatform() {
    const username = document.getElementById("username-input").value.trim();
    if (!username) { alert("Please enter a username"); return; }

    const avatar = this.getSelectedAvatar();
    this.player = LobbyManifold.createPlayer(username, avatar);

    this.showLobby();
  },

  guestMode() {
    const guestName = "Guest_" + Math.random().toString(36).substr(2, 4);
    this.player = LobbyManifold.createPlayer(guestName, "👤");
    this.showLobby();
  },

  joinByCode() {
    const code = prompt("Enter 6-character room code:");
    if (!code) return;

    if (!this.player) this.guestMode();

    const result = LobbyManifold.joinRoom(this.player.id, code.toUpperCase());
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || "Could not join room");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════════════════════════════════════
  showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
  },

  showLobby() {
    document.getElementById("display-name").textContent = this.player.username;
    document.getElementById("display-avatar").textContent = this.player.avatarId;
    this.showScreen("lobby-screen");
    this.updateRoomList();
    this.initLobby3D();
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LOBBY 3D WIZARDS — interactive manifold visualizations
  // ═══════════════════════════════════════════════════════════════════════
  _lobby3d: null,

  initLobby3D() {
    if (this._lobby3d) return; // only once
    const container = document.getElementById("lobby-3d-widget");
    if (!container) return;

    const w = container.clientWidth || 300;
    const h = container.clientHeight || 200;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 50);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ─── 7 interconnected icosahedrons on helix ───
    const helixGroup = new THREE.Group();
    const SECTION_COLORS = [0xff2d95, 0x00d4ff, 0xb24dff, 0x39ff14, 0xffd700, 0xff6b35, 0x00ffaa];
    const nodes = [];
    for (let s = 0; s < 7; s++) {
      const angle = (s / 7) * Math.PI * 2;
      const radius = 1.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 2) * 0.5; // saddle z = x·y

      const geo = new THREE.IcosahedronGeometry(0.2, 0);
      const mat = new THREE.MeshPhongMaterial({
        color: SECTION_COLORS[s],
        emissive: SECTION_COLORS[s],
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      nodes.push(mesh);
      helixGroup.add(mesh);

      // Connect each node to the next with a glowing line
      if (s > 0) {
        const prev = nodes[s - 1].position;
        const curr = mesh.position;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([prev, curr]);
        const lineMat = new THREE.LineBasicMaterial({
          color: SECTION_COLORS[s], transparent: true, opacity: 0.4,
        });
        helixGroup.add(new THREE.Line(lineGeo, lineMat));
      }
    }
    // Close the helix loop
    const lastP = nodes[6].position, firstP = nodes[0].position;
    const closeGeo = new THREE.BufferGeometry().setFromPoints([lastP, firstP]);
    const closeMat = new THREE.LineBasicMaterial({ color: 0xff2d95, transparent: true, opacity: 0.4 });
    helixGroup.add(new THREE.Line(closeGeo, closeMat));

    scene.add(helixGroup);

    // ─── Central saddle mini-mesh ───
    const miniS = 16;
    const mverts = [], mnormals = [], mindices = [];
    for (let j = 0; j <= miniS; j++) {
      for (let i = 0; i <= miniS; i++) {
        const u = i / miniS, v = j / miniS;
        const mx = (u - 0.5) * 3, mz = (v - 0.5) * 3;
        const my = mx * mz * 0.25;
        mverts.push(mx, my, mz);
        const nx = -mz * 0.25, ny = 1, nz = -mx * 0.25;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
        mnormals.push(nx/len, ny/len, nz/len);
      }
    }
    for (let j = 0; j < miniS; j++) {
      for (let i = 0; i < miniS; i++) {
        const a = j*(miniS+1)+i, b = a+1, c = a+miniS+1, d = c+1;
        mindices.push(a,b,d, a,d,c);
      }
    }
    const miniGeo = new THREE.BufferGeometry();
    miniGeo.setAttribute('position', new THREE.Float32BufferAttribute(mverts, 3));
    miniGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mnormals, 3));
    miniGeo.setIndex(mindices);
    const miniMat = new THREE.MeshPhongMaterial({
      color: 0x1a0033, emissive: 0x0a0020,
      wireframe: true, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const miniSaddle = new THREE.Mesh(miniGeo, miniMat);
    helixGroup.add(miniSaddle);

    // Lights
    scene.add(new THREE.AmbientLight(0x1a0033, 0.6));
    const pl = new THREE.PointLight(0xff2d95, 1, 15);
    pl.position.set(2, 3, 2);
    scene.add(pl);
    const pl2 = new THREE.PointLight(0x00d4ff, 1, 15);
    pl2.position.set(-2, 3, -2);
    scene.add(pl2);

    this._lobby3d = { scene, camera, renderer, helixGroup, nodes, pl, pl2 };

    let t = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      t += 0.005;
      helixGroup.rotation.y = t * 0.3;
      helixGroup.rotation.x = Math.sin(t * 0.5) * 0.15;

      // Pulse each node
      nodes.forEach((n, i) => {
        const phase = t + i * 0.9;
        n.scale.setScalar(1 + Math.sin(phase * 2) * 0.15);
        n.material.emissiveIntensity = 0.3 + Math.sin(phase * 3) * 0.2;
      });

      pl.intensity = 0.8 + Math.sin(t * 2) * 0.4;
      pl2.intensity = 0.8 + Math.cos(t * 2) * 0.4;

      renderer.render(scene, camera);
    };
    animate();
  },

  showRoom() {
    document.getElementById("room-code").textContent = this.currentRoom.code;
    this.updateRoomPlayers();
    this.showScreen("room-screen");
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GAME SELECTION
  // ═══════════════════════════════════════════════════════════════════════
  loadGames() {
    const container = document.getElementById("game-cards");
    const games = GameRegistry.list();

    container.innerHTML = games.map(g => `
      <div class="game-card" data-game="${g.id}" onclick="KensGames.selectGame('${g.id}')">
        <div class="game-icon">${g.icon}</div>
        <div class="game-title">${g.name}</div>
        <div class="game-desc">${g.desc}</div>
        <div class="game-players">${g.minPlayers}-${g.maxPlayers} players${g.aiSupport ? " • AI Support" : ""}</div>
      </div>
    `).join("");

    // Wire up 3D tilt on game cards
    this.initCardTilt();
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3D CARD TILT — mouse-reactive CSS transforms via --rx/--ry/--mx/--my
  // ═══════════════════════════════════════════════════════════════════════
  initCardTilt() {
    document.querySelectorAll(".game-card").forEach(card => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;   // 0..1
        const y = (e.clientY - rect.top) / rect.height;    // 0..1
        const tiltX = (0.5 - y) * 12;   // ±6 deg
        const tiltY = (x - 0.5) * 12;   // ±6 deg
        card.style.setProperty("--rx", tiltX + "deg");
        card.style.setProperty("--ry", tiltY + "deg");
        card.style.setProperty("--mx", (x * 100) + "%");
        card.style.setProperty("--my", (y * 100) + "%");
      });
      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "50%");
      });
    });
  },

  selectGame(gameId) {
    this.selectedGame = GameRegistry.get(gameId);

    document.querySelectorAll(".game-card").forEach(el => {
      el.classList.toggle("selected", el.dataset.game === gameId);
    });

    document.getElementById("selected-game-title").textContent = this.selectedGame.name;
    document.getElementById("matchmaking-panel").style.display = "block";
    document.getElementById("ai-settings").style.display = this.selectedGame.aiSupport ? "block" : "none";
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MATCHMAKING
  // ═══════════════════════════════════════════════════════════════════════
  vsAI() {
    if (!this.selectedGame) { alert("Select a game first"); return; }

    const difficulty = document.getElementById("ai-difficulty").value;
    const result = LobbyManifold.vsAI(this.player.id, this.selectedGame.id, difficulty);

    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || "Could not create game");
    }
  },

  quickMatch() {
    if (!this.selectedGame) { alert("Select a game first"); return; }

    const result = LobbyManifold.quickMatch(this.player.id, this.selectedGame.id);
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || "Could not find/create game");
    }
  },

  createPrivate() {
    if (!this.selectedGame) { alert("Select a game first"); return; }

    const result = LobbyManifold.createRoom(this.player.id, this.selectedGame.id, "PRIVATE");
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || "Could not create room");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROOM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  updateRoomPlayers() {
    const container = document.getElementById("room-players");
    if (!this.currentRoom) return;

    const allPlayers = [...this.currentRoom.players, ...this.currentRoom.aiPlayers];

    container.innerHTML = allPlayers.map(p => `
      <div class="player-item">
        <span class="player-avatar">${p.avatarId}</span>
        <span class="player-name">${p.username}</span>
        ${p.id === this.currentRoom.hostId ? '<span class="player-badge badge-host">HOST</span>' : ""}
        ${p.isAI ? '<span class="player-badge badge-ai">AI</span>' : ""}
      </div>
    `).join("");

    // Enable start if host and enough players
    const isHost = this.currentRoom.hostId === this.player.id;
    const hasEnough = allPlayers.length >= this.currentRoom.minPlayers;
    document.getElementById("start-btn").disabled = !(isHost && hasEnough);
  },

  updateRoomList() {
    const container = document.getElementById("room-list");
    const rooms = Array.from(LobbyManifold.rooms.values()).filter(r => r.status === "waiting");

    if (rooms.length === 0) {
      container.innerHTML = '<p class="empty-state">No active rooms. Create one above!</p>';
      return;
    }

    container.innerHTML = rooms.map(r => {
      const game = GameRegistry.get(r.gameId);
      const total = r.players.length + r.aiPlayers.length;
      return `
        <div class="room-item">
          <div class="room-info">
            <div class="room-game">${game?.icon || "🎮"} ${game?.name || r.gameId}</div>
            <div class="room-status">${total}/${r.maxPlayers} players • ${r.code}</div>
          </div>
          <button class="btn btn-secondary room-join" onclick="KensGames.joinRoomByCode('${r.code}')">Join</button>
        </div>
      `;
    }).join("");
  },

  joinRoomByCode(code) {
    const result = LobbyManifold.joinRoom(this.player.id, code);
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || "Could not join room");
    }
  },

  leaveRoom() {
    if (this.currentRoom) {
      LobbyManifold.leaveRoom(this.player.id, this.currentRoom.code);
      this.currentRoom = null;
    }
    this.showLobby();
  },

  copyCode() {
    if (this.currentRoom) {
      navigator.clipboard.writeText(this.currentRoom.code);
      alert("Code copied: " + this.currentRoom.code);
    }
  },

  startGame() {
    if (!this.currentRoom) return;

    const result = LobbyManifold.startGame(this.currentRoom.code);
    if (result.success) {
      const game = GameRegistry.get(this.currentRoom.gameId);
      if (game?.url) {
        window.location.href = game.url;
      }
    }
  }
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => KensGames.init());
