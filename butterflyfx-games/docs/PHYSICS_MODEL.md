# ButterflyFX Games — Physics Model

Detailed physics equations and energy system for 3D games.

---

## Coordinate System

- **Origin**: Center of arena
- **X-axis**: Left-right (player's perspective)
- **Y-axis**: Up-down (vertical)
- **Z-axis**: Forward-backward (depth)

---

## Gravity

- **Acceleration**: g = 9.8 m/s² (downward, -Y direction)
- **Force on object**: F = m × g (where m is mass)
- **Velocity update**: v_y(t+dt) = v_y(t) - g × dt
- **Position update**: y(t+dt) = y(t) + v_y(t) × dt - 0.5 × g × dt²

---

## Ball Physics

### State
- **Position**: (x, y, z)
- **Velocity**: (vx, vy, vz)
- **Energy**: E (0..100 units)
- **Size**: r (radius, 0.5..1.0 units)
- **Mass**: m = 1.0 kg (constant)

### Energy System
- **Base energy**: 100 units
- **Minimum floor**: 20 units (prevents getting stuck)
- **Energy decay**: -1 unit/second (natural loss)
- **Paddle hit**: +20 to +50 units (depends on paddle speed and angle)
- **Wall bounce**: -10 to -30 units (depends on wall material)
- **Brick hit**: -5 to -15 units (depends on brick material)
- **Debris collision**: -5 to -10 units

### Velocity from Energy
```
speed = sqrt(2 × E / m) = sqrt(2 × E)  (since m = 1.0)
velocity = speed × direction_vector
```

### Collision with Paddle
```
# Paddle angle affects deflection
angle_deflection = paddle_angle × 0.5  # 0° = shallow, 90° = steep

# Ball velocity after paddle hit
v_new = reflect(v_old, paddle_normal) + angle_deflection × paddle_velocity

# Energy transfer
E_new = E_old + paddle_speed_bonus + angle_bonus
E_new = clamp(E_new, 20, 100)  # enforce min/max
```

### Collision with Wall
```
# Wall reflects ball
v_new = reflect(v_old, wall_normal)

# Energy absorption (depends on wall material)
# Glass: absorbs 10 units
# Metal: absorbs 20 units
# Obsidian: absorbs 30 units
E_new = E_old - wall_absorption
E_new = max(E_new, 20)  # enforce minimum
```

### Collision with Brick
```
# Brick reflects ball
v_new = reflect(v_old, brick_normal)

# Energy transfer
E_new = E_old - brick_absorption
E_new = max(E_new, 20)

# Brick damage (size reduction)
brick_size_new = brick_size_old × 0.9  # 10% reduction per hit
```

### Collision with Debris
```
# Both ball and debris change trajectory
v_ball_new = reflect(v_ball, debris_normal) × 0.8  # 20% energy loss
v_debris_new = reflect(v_debris, ball_normal) × 0.9

# Size reduction (simulating damage)
ball_size_new = ball_size_old × 0.95  # 5% reduction
debris_size_new = debris_size_old × 0.90  # 10% reduction

# Energy transfer
E_ball_new = E_ball_old - 5
E_debris_new = E_debris_old - 10  # debris has energy too
```

### Size Recovery
```
# Ball size recovers over time
ball_size(t) = min(ball_size(t-dt) + 0.01, 1.0)  # +1% per second

# Or via paddle hit
ball_size_new = min(ball_size_old + 0.02, 1.0)  # +2% per paddle hit
```

---

## Paddle Physics

### State
- **Position**: (x, y, z) (y is fixed at bottom of arena)
- **Angle**: θ (0° = flat, 90° = vertical)
- **Size**: s (0.5..1.0 units, width)
- **Velocity**: v (player-controlled)

### Angle-Dependent Deflection
```
# Shallow angle (0°) = shallow deflection
# Steep angle (90°) = steep deflection

deflection_angle = θ × 0.5  # scale to [-45°, 45°]
deflection_vector = rotate(ball_velocity, deflection_angle)
```

### Size Reduction from Debris
```
# Debris collision reduces paddle size
paddle_size_new = paddle_size_old × 0.85  # 15% reduction per hit
paddle_size_new = max(paddle_size_new, 0.3)  # minimum size

# Size restoration from ball hits
paddle_size_new = min(paddle_size_old + 0.05, 1.0)  # +5% per ball hit
```

---

## Brick Physics

### State
- **Position**: (x, y, z)
- **Size**: s (golden ratio progression)
- **Color**: c (per level)
- **Material**: m (crystal, glass, etc.)

### Golden Ratio Sizing
```
# Layer 0 (bottom): s_0 = 1.0
# Layer 1: s_1 = s_0 × φ^(-1) ≈ 0.618
# Layer 2: s_2 = s_1 × φ^(-1) ≈ 0.382
# Layer N: s_N = s_0 × φ^(-N)

# where φ = (1 + √5) / 2 ≈ 1.618
# and φ^(-1) ≈ 0.618
```

### Gravity on Bricks
```
# When destroyed, bricks fall
y_new = y_old - 0.5 × g × dt²
vy_new = vy_old - g × dt

# Collision with paddle or ball
# Trajectory changes based on collision normal
```

---

## Debris Physics

### State
- **Position**: (x, y, z)
- **Velocity**: (vx, vy, vz)
- **Size**: s (starts at brick size, reduces on collision)
- **Energy**: E (starts at 50 units)

### Falling
```
# Debris falls under gravity
y_new = y_old + vy_old × dt - 0.5 × g × dt²
vy_new = vy_old - g × dt
```

### Collision with Paddle
```
# Debris bounces off paddle
v_new = reflect(v_old, paddle_normal)

# Paddle size reduction
paddle_size_new = paddle_size_old × 0.85

# Debris size reduction
debris_size_new = debris_size_old × 0.90
```

### Collision with Ball
```
# Both change trajectory
v_ball_new = reflect(v_ball, debris_normal) × 0.8
v_debris_new = reflect(v_debris, ball_normal) × 0.9

# Size reductions
ball_size_new = ball_size_old × 0.95
debris_size_new = debris_size_old × 0.90
```

---

## Collision Detection

### Sphere-Sphere Collision
```
# Ball vs Paddle, Ball vs Brick, Ball vs Debris
distance = ||pos_ball - pos_object||
collision = distance < (radius_ball + radius_object)

# Collision normal
normal = (pos_ball - pos_object) / distance
```

### Sphere-Plane Collision
```
# Ball vs Wall
distance = |dot(pos_ball - plane_point, plane_normal)|
collision = distance < radius_ball

# Collision normal
normal = plane_normal
```

### Sphere-Box Collision
```
# Ball vs Arena (cubic)
# Clamp ball position to box bounds
closest_point = clamp(pos_ball, box_min, box_max)
distance = ||pos_ball - closest_point||
collision = distance < radius_ball
```

---

## Reflection Formula

```
# Reflect velocity off surface
v_reflected = v_incident - 2 × dot(v_incident, normal) × normal

# With energy loss (e.g., wall absorption)
v_reflected = (v_incident - 2 × dot(v_incident, normal) × normal) × (1 - energy_loss_factor)
```

---

## Scoring

### Points per Brick
```
points = 10 × (level × layer_height)

# Example (Level 1):
# Layer 0 (bottom): 10 points
# Layer 1: 20 points
# Layer 2: 30 points
# Layer 3: 40 points
# Layer 4 (top): 50 points
```

### Combo Multiplier
```
# Destroy N bricks without missing
combo_multiplier = 1.0 + (N - 1) × 0.1  # 1.0x, 1.1x, 1.2x, ...
combo_multiplier = min(combo_multiplier, 2.0)  # cap at 2.0x
```

### Bonuses
```
# Time bonus (clear level in <2 minutes)
time_bonus = 500

# Energy bonus (finish with >80% energy)
energy_bonus = 250

# Perfect level (no paddle size reduction)
perfect_bonus = 1000

# Total score
score = sum(brick_points × combo_multiplier) + time_bonus + energy_bonus + perfect_bonus
```

---

## Constants and Tuning

| Parameter | Value | Notes |
|-----------|-------|-------|
| Gravity | 9.8 m/s² | Standard Earth gravity |
| Ball mass | 1.0 kg | Constant |
| Ball radius | 0.5–1.0 units | Starts at 1.0, reduces on damage |
| Paddle width | 0.5–1.0 units | Starts at 1.0, reduces on debris hit |
| Paddle height | 0.1 units | Fixed |
| Brick size (layer 0) | 1.0 units | Golden ratio progression upward |
| Golden ratio | 1.618 | φ = (1 + √5) / 2 |
| Energy decay | 1 unit/sec | Natural loss over time |
| Energy min | 20 units | Prevents getting stuck |
| Energy max | 100 units | Cap on energy |
| Paddle hit bonus | +20 to +50 | Depends on paddle speed |
| Wall absorption | 10–30 units | Depends on material |
| Brick absorption | 5–15 units | Depends on material |
| Debris absorption | 5–10 units | On collision |

---

## Validation

### Unit Tests
- Ball falls under gravity: y decreases, vy becomes more negative
- Paddle deflection: shallow angle = shallow deflection, steep angle = steep deflection
- Energy conservation: energy decreases on collisions, never increases without paddle hit
- Size recovery: ball and paddle sizes increase over time or on hits
- Collision detection: sphere-sphere, sphere-plane, sphere-box all work correctly

### Integration Tests
- Full game loop: physics, collision, scoring all work together
- Determinism: same inputs → same game state always
- Edge cases: ball at minimum energy, paddle at minimum size, debris at minimum size

---

## References

- Physics equations: Standard Newtonian mechanics
- Reflection formula: Standard vector reflection
- Golden ratio: φ = (1 + √5) / 2 ≈ 1.618
