# Live House Music Visualizer 🎧

Professional real-time visualization system for live house music performances, DJ sets, and electronic music events.

High-performance WebGL audio-reactive visualizations with advanced beat detection, optimized for club environments.

Real-time microphone input, BPM tracking, and house music genre-specific visual presets.

**🚀 [Try it live on GitHub Pages!](https://spencersmolen.github.io/live-visuals)**

![Live House Music Visualizer](assets/siteOGImage2.png)

## Overview

Perfect for:
- DJs performing live house music sets
- VJs creating visuals for electronic music events  
- Club owners enhancing their venue atmosphere
- Electronic music producers showcasing their tracks
- Live streaming performances with reactive visuals
- Music festivals and electronic dance events

## Features

- **Live Microphone Input** - Real-time audio analysis from microphone or audio interface
- **Advanced Beat Detection** - AI-powered beat detection optimized for house music (120-140 BPM)
- **Real-time BPM Tracking** - Automatic tempo detection and synchronization
- **House Music Presets** - Genre-specific visuals for Deep House, Progressive House, Tech House, Acid House, Electro House, and Future House
- **Low-Latency Performance** - Sub-10ms audio-to-visual response time for live shows
- **Fullscreen Presentation** - Immersive fullscreen mode for projectors and large displays
- **60+ FPS Rendering** - Smooth high-framerate visuals optimized for live performance
- **Professional Controls** - Real-time parameter adjustment during live sets
- **Multiple Audio Sources** - Support for microphone, line input, and uploaded audio files
- **Live Mode Interface** - Performance-optimized UI with beat indicators and BPM display

## Live Performance Controls

| Control | Keyboard | Description |
|---------|----------|-------------|
| 🎲 | [R] | Randomize visual style |
| ⏯️ | [Space] | Pause/play the animation |
| 🎤 | [I] | Enable live microphone input |
| 🔴 | [L] | Activate live performance mode |
| ⛶ | [F] | Toggle fullscreen mode |
| 📷 | [S] | Save current frame |
| 🎵 | Click | Upload audio track for testing |

Additional live controls:
- [B] - Toggle beat detection
- [Tab] - Refresh visual pattern
- [T] - Restart animation timing

## House Music Visual Presets

Choose from professionally designed presets optimized for electronic music:
- **Ambient Flow** - Smooth, ethereal movements perfect for chill and ambient tracks
- **High Energy** - Dynamic, pulsing visuals for electronic and dance music
- **Minimalist** - Clean, simple patterns for indie and acoustic music
- **Abstract Art** - Complex, artistic patterns for experimental music
- **Retro Wave** - Nostalgic 80s-inspired visuals for synthwave and retro tracks
- **Organic Shapes** - Natural, flowing patterns for folk and organic music

## Technical Details

This project is built using:
- WebGL shaders for high-performance rendering
- Web Audio API for real-time audio analysis
- Vanilla JavaScript for logic and interactivity
- HTML5 Canvas for display
- CSS3 with Spotify-themed styling
- dat.GUI for the control interface
- MP4 muxer for video encoding and export

The fragment shader features:
- 3D simplex noise and fractal Brownian motion for organic patterns
- Audio-reactive parameter modulation
- Seed-based randomization for unique visuals
- Real-time shader effects (bloom, saturation, grain, distortion)
- Optimized for Spotify Canvas format (720x1280, 9:16 aspect ratio)

## Quick Start

### 🌐 Use Online (Recommended)
Visit the live version: **[https://spencersmolen.github.io/spotify-canvas](https://spencersmolen.github.io/spotify-canvas)**

### 💻 Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/spencersmolen/spotify-canvas.git
   cd spotify-canvas
   ```

2. Open `index.html` in a web browser, or use a local server:
   ```bash
   npx http-server
   # or
   python -m http.server 8080
   ```

That's it! No build process, dependencies, or server setup required.

## 🚀 GitHub Pages Deployment

This repository is configured for automatic GitHub Pages deployment:

1. **Enable GitHub Pages** in your repository settings
2. **Set source** to "GitHub Actions" 
3. **Push to main branch** - the site deploys automatically
4. **Visit** your site at `https://spencersmolen.github.io/spotify-canvas`

The deployment workflow is located in `.github/workflows/deploy.yml` and runs automatically on every push to the main branch.

## How to Use

1. **Choose a Canvas Preset** - Click "Canvas Presets" and select a style that matches your music
2. **Upload Your Audio** - Click the 🎵 button to upload your track for audio-reactive visuals
3. **Customize** - Use the control panel to fine-tune colors, effects, and animation parameters
4. **Preview** - Watch your canvas in real-time and make adjustments
5. **Export** - Click 🎥 to export your canvas as an MP4 video ready for Spotify upload

## Performance Notes

The WebGL shaders used in this project can be resource-intensive. For optimal performance:
- Close unnecessary browser tabs
- Ensure your device has adequate GPU capabilities
- Reduce the canvas size if experiencing lag
- Ensure your device is not in battery-saving mode

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Related Projects

Check out other free and open-source projects by the same developer:

- [Particular Drift](https://collidingScopes.github.io/particular-drift) - Turn photos into flowing particle animations
- [Liquid Logo](https://collidingScopes.github.io/liquid-logo) - Transform logos and icons into liquid metal animations
- [Video-to-ASCII](https://collidingScopes.github.io/ascii) - Convert videos into ASCII pixel art
- [Shape Shimmer](https://collidingScopes.github.io/shimmer) - Turn photos into funky wave animations
- [Colliding Scopes](https://collidingScopes.github.io) - Turn photos into kaleidoscope animations
- [Manual Brick Breaker](https://manual-brick-breaker.netlify.app) - Play brick breaker by waving your hands around

## Connect with the Developer

- Instagram: [@stereo.drift](https://www.instagram.com/stereo.drift/)
- Twitter/X: [@measure_plan](https://x.com/measure_plan)
- Email: [stereodriftvisuals@gmail.com](mailto:stereodriftvisuals@gmail.com)
- GitHub: [collidingScopes](https://github.com/collidingScopes)

## Donations

If you found this tool useful, feel free to buy me a coffee. 

My name is Alan, and I enjoy building open source software for art, animation, games, and more. This would be much appreciated during late-night coding sessions!

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png)](https://www.buymeacoffee.com/stereoDrift)