# Spotify Canvas Generator 🎵

Create stunning animated visuals for your Spotify tracks with customizable canvas templates.

Professional-quality canvas animations optimized for Spotify's canvas format.

WebGL shader animations with liquid motion, distorted shapes, shadows, and dynamic audio-reactive effects.

**🚀 [Try it live on GitHub Pages!](https://spencersmolen.github.io/spotify-canvas)**

![Spotify Canvas Generator Example](assets/siteOGImage2.png)

## Overview

Perfect for:
- Musicians and producers creating Spotify canvases
- Record labels enhancing track visuals
- Independent artists building their brand
- Content creators needing animated backgrounds

## Features

- **Spotify Canvas Optimization** - Pre-configured 9:16 aspect ratio perfect for Spotify
- **Audio Reactive Visuals** - Upload your track and watch visuals respond to bass, mids, and treble
- **Canvas Style Presets** - Choose from Ambient, Energetic, Minimal, Abstract, Retro, and Organic styles
- **Real-time rendering** - See changes instantly in the browser
- **Professional Export** - Export high-quality MP4 videos ready for Spotify upload
- **Extensive controls** - Fine-tune animation parameters, colors, and effects
- **Multiple Formats** - Support for Spotify Canvas (9:16), Square (1:1), and Landscape (16:9)
- **Completely free** - No paywalls, no premium options
- **Open source** - MIT licensed for personal and commercial use

## Controls

| Control | Keyboard | Description |
|---------|----------|-------------|
| 🎲 | [R] | Randomize canvas style |
| ⏯️ | [Space] | Pause/play the animation |
| 📷 | [S] | Save canvas preview image |
| 🎥 | [V] | Export Spotify canvas video |
| 🔊 | [M] | Toggle audio preview |
| 🎵 | Click | Upload your audio track |

Additional keyboard shortcuts:
- [Tab] - Refresh pattern with a new random seed
- [T] - Restart animation from time = 0

## Canvas Presets

Choose from professionally designed presets:
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