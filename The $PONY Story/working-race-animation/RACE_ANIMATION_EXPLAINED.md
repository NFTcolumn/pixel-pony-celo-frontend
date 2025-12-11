# Race Animation System - How It Works

## Overview
The Pixel Pony race animation system creates a smooth, realistic horse racing visualization that uses actual blockchain results to determine winners. This document explains the complete animation pipeline.

## Key Components

### 1. Race Track Structure (HTML/CSS)

#### Track Container
- **Full-screen overlay** (game.html:415-423) - Dark background that covers entire viewport
- **Track lanes** (game.html:434-441) - 16 horizontal lanes with gradient background
- **Start/Finish lines** (game.html:492-505) - Visual markers using CSS gradients

#### Horse Racers
- **Position**: Absolutely positioned within lanes
- **Size**: 32x32px (game.html) or 24x24px (miniapp.html)
- **Rendering**: Pixelated image rendering for retro look
- **Initial position**: 35px from left (behind start line)

```css
.horse-racer {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    transition: left 0.1s linear;  /* Smooth movement */
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
}
```

### 2. Race Animation Algorithm

#### Core Logic (game.html:1375-1458)

The animation works in these phases:

**Phase 1: Setup**
1. Generate random speeds for all 16 horses (0.5 - 1.0 multiplier)
2. Override speeds for known winners:
   - 1st place: 1.2x speed (fastest)
   - 2nd place: 1.1x speed (fast)
   - 3rd place: 1.0x speed (medium-fast)
3. Calculate track width and finish position

**Phase 2: Animation Loop (runs every 50ms)**
```javascript
const animationInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);  // 0 to 1

    // Update each horse position
    for (let i = 0; i < 16; i++) {
        const horse = document.getElementById(`horse-${i}`);
        if (horse) {
            const speed = horseSpeeds[i];
            const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease-out curve
            const position = 35 + (finishPosition - 35) * easeProgress * speed;
            horse.style.left = position + 'px';
        }
    }

    if (progress >= 1) {
        clearInterval(animationInterval);
        // Show winner badges and celebrate
    }
}, 50); // 20 FPS update rate
```

**Phase 3: Results Display**
- Show winner badges (🥇 1st, 🥈 2nd, 🥉 3rd)
- Add winner pulse animation to 1st place
- Display result overlay after 500ms delay

### 3. Easing Function

The animation uses a **quadratic ease-out** function:
```javascript
const easeProgress = 1 - Math.pow(1 - progress, 2);
```

This creates a natural deceleration effect:
- Horses start fast
- Gradually slow down near the finish line
- Mimics real horse racing fatigue

**Progress curve visualization:**
- Linear: 0.0 → 0.25 → 0.50 → 0.75 → 1.0
- Eased: 0.0 → 0.44 → 0.75 → 0.94 → 1.0

### 4. Speed Calculation

Each horse's position is calculated as:
```
position = startPos + (distance * easeProgress * speedMultiplier)
```

**Example for 1st place winner:**
- startPos: 35px
- distance: trackWidth - 35 (e.g., 500px)
- easeProgress: varies 0→1 over 5 seconds
- speedMultiplier: 1.2

At progress = 0.5 (2.5 seconds):
- easeProgress = 1 - (1-0.5)² = 0.75
- position = 35 + (500 × 0.75 × 1.2) = 485px

### 5. Visual Effects

#### Player Horse Highlight
```css
.horse-racer.player-horse {
    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
    transform: translateY(-50%) scale(1.1);
}
```

#### Winner Pulse Animation
```css
@keyframes winner-pulse {
    0%, 100% {
        transform: translateY(-50%) scale(1);
        filter: brightness(1);
    }
    50% {
        transform: translateY(-50%) scale(1.3);
        filter: drop-shadow(0 0 12px rgba(255, 215, 0, 1)) brightness(1.2);
    }
}
```

### 6. Integration with Blockchain

The animation is triggered after blockchain confirmation:

```javascript
// game.html:1210-1232
const receipt = await tx.wait(); // Wait for blockchain confirmation
const raceEvent = receipt.events?.find(e => e.event === 'RaceExecuted');

if (raceEvent) {
    const { winners } = raceEvent.args;
    const winnerIds = [
        parseInt(winners[0].toString()),
        parseInt(winners[1].toString()),
        parseInt(winners[2].toString())
    ];

    // Animate race with actual winners
    await animateRace(selectedHorse, winnerIds);
}
```

## Key Differences: game.html vs miniapp.html

| Feature | game.html | miniapp.html |
|---------|-----------|--------------|
| Track Display | Section on page | Full-screen overlay |
| Horse Size | 32x32px | 24x24px |
| Animation Duration | 5000ms | 5000ms |
| Update Rate | 50ms (20 FPS) | 50ms (20 FPS) |
| Speed Multipliers | Same (0.5-1.2x) | Same (0.5-1.2x) |
| Easing Function | Quadratic ease-out | Quadratic ease-out |

## Performance Optimizations

1. **Fixed update rate (50ms)** - Balances smoothness with performance
2. **CSS transitions** - GPU-accelerated for smooth movement
3. **Image preloading** - Sprites loaded before race starts
4. **Pixelated rendering** - Maintains pixel art style at any scale

## Common Pitfalls to Avoid

1. **Don't use linear progress** - Looks robotic and unnatural
2. **Don't update too frequently** - 20 FPS (50ms) is optimal for pixel art
3. **Don't make all winners super fast** - Gradual speed differences (1.2, 1.1, 1.0) create realistic race dynamics
4. **Don't forget to clear intervals** - Memory leak prevention

## Files Involved

- `public/game.html` - Desktop version with race animation
- `public/miniapp.html` - Mobile/Farcaster version with fullscreen overlay
- Race animation functions:
  - `showRaceVisualization()` - game.html:1320-1373
  - `animateRace()` - game.html:1375-1458
  - `createTrack()` - miniapp.html:972-989
  - `animateRace()` - miniapp.html:997-1050

## Timeline of a Race

1. **T=0s**: User clicks "Place Bet & Race"
2. **T=0-2s**: Blockchain transaction submitting/confirming
3. **T=2s**: Transaction confirmed, winners extracted from event
4. **T=2.1s**: Race track displayed, horses positioned at start
5. **T=2.1-7.1s**: 5-second animation with horses moving
6. **T=7.1s**: Winner badges displayed
7. **T=7.6s**: Result overlay shown
8. **T=12.6s**: Track automatically closes (optional)
