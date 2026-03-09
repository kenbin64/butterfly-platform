http://127.0.0.1:8000/breakout3d.html# ButterflyFX Games — Local Development Guide

Quick start guide to run Breakout 3D on your local machine.

---

## Prerequisites

- Python 3.7+ (check: `python --version`)
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Git (optional, for cloning)

---

## Option 1: Windows (Easiest)

### 1.1) Double-click the batch file

```
run_dev_server.bat
```

The game will open automatically in your browser at:
```
http://127.0.0.1:8000/breakout3d.html
```

### 1.2) Stop the server

Press `Ctrl+C` in the command prompt window.

---

## Option 2: macOS / Linux

### 2.1) Run the shell script

```bash
bash run_dev_server.sh
```

The game will open automatically in your browser at:
```
http://127.0.0.1:8000/breakout3d.html
```

### 2.2) Stop the server

Press `Ctrl+C` in the terminal.

---

## Option 3: Manual (Any OS)

### 3.1) Open terminal/command prompt

Navigate to the butterflyfx-games directory:

```bash
cd c:\universe\butterflyfx-games
```

### 3.2) Start Python HTTP server

```bash
python -m http.server 8000
```

Or with Python 3:

```bash
python3 -m http.server 8000
```

### 3.3) Open in browser

```
http://127.0.0.1:8000/breakout3d.html
```

### 3.4) Stop the server

Press `Ctrl+C` in the terminal.

---

## Playing the Game

### Controls

- **Mouse**: Move paddle left/right
- **Space**: Launch ball
- **C**: Toggle camera mode (Auto ↔ Manual)
- **Arrow Keys**: Manual camera rotation (when in manual mode)
- **Button**: Click "Auto Camera" / "Manual Camera" to toggle

### Camera Modes

- **Auto Camera** (default):
  - Automatically follows the ball
  - Pans out when ball is near paddle
  - Focuses on ball when near top
  - Smooth transitions

- **Manual Camera**:
  - Move mouse to rotate camera around arena
  - Arrow keys for fine control
  - Full 360° control

### Gameplay

- Destroy all bricks to advance
- Keep the ball in play
- Paddle size increases on ball hits
- Ball energy decreases over time
- Minimum energy floor prevents getting stuck

---

## Troubleshooting

### "Python is not installed"

Install Python 3.7+ from https://www.python.org/

Make sure to check "Add Python to PATH" during installation.

### Port 8000 already in use

Use a different port:

```bash
python -m http.server 8001
# Then open: http://127.0.0.1:8001/breakout3d.html
```

### Browser doesn't open automatically

Manually open:
```
http://127.0.0.1:8000/breakout3d.html
```

### Game is slow or laggy

- Close other applications
- Use a modern browser (Chrome recommended)
- Check browser console for errors (F12)

### Graphics look wrong

- Update your graphics drivers
- Try a different browser
- Check that WebGL is enabled (chrome://gpu)

---

## Development Tips

### Edit the game

The game code is in `breakout3d.html`. Edit it with any text editor:

- Visual Studio Code (recommended)
- Sublime Text
- Notepad++
- Any text editor

### Reload the game

After editing, refresh the browser:
- Press `F5` or `Ctrl+R`
- Or click the refresh button

### Debug the game

Open browser developer tools:
- Press `F12` or `Ctrl+Shift+I`
- Go to "Console" tab
- Look for errors or messages

### Check performance

In browser developer tools:
- Go to "Performance" tab
- Click "Record"
- Play the game for a few seconds
- Click "Stop"
- Analyze the performance graph

---

## Next Steps

1. **Play the game** and test all features
2. **Edit the code** to customize gameplay
3. **Push to GitHub** when ready
4. **Deploy to VPS** using DEPLOYMENT_INSTRUCTIONS.md

---

## File Structure

```
butterflyfx-games/
├── breakout3d.html          # Main game (edit this to customize)
├── dev_server.py            # Python dev server
├── run_dev_server.bat       # Windows launcher
├── run_dev_server.sh        # macOS/Linux launcher
├── LOCAL_DEV.md             # This file
├── README.md                # Project overview
├── DEPLOYMENT_INSTRUCTIONS.md
├── docs/
│   ├── BREAKOUT3D_DESIGN.md
│   ├── GAME_DESIGN.md
│   ├── PHYSICS_MODEL.md
│   └── DEPLOY.md
└── deploy/
    ├── docker-compose.yaml
    ├── nginx.conf
    ├── deploy.sh
    └── systemd/
```

---

## Support

- Check browser console for errors: `F12`
- Review game code in `breakout3d.html`
- See BREAKOUT3D_DESIGN.md for game design details
- See PHYSICS_MODEL.md for physics equations

---

## Quick Commands

### Start dev server (Windows)
```
run_dev_server.bat
```

### Start dev server (macOS/Linux)
```
bash run_dev_server.sh
```

### Start dev server (manual)
```
python -m http.server 8000
```

### Open game
```
http://127.0.0.1:8000/breakout3d.html
```

### Stop server
```
Ctrl+C
```

---

Enjoy playing Breakout 3D! 🎮
