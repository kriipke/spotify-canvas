/*
To do:
Press z for zen mode (hides all control and other display on top of the canvas)
Ability to add this shader effect on top of an image?
Presets / seed choice??
Allow user to upload a song, and then it becomes audio reactive?
Generate perfect loops in x seconds
*/

// Initialize WebGL context
const canvas = document.getElementById('canvas');
// Spotify Canvas optimal dimensions - 9:16 aspect ratio (vertical)
let startingWidth = 720; // Spotify canvas width
let startingHeight = 1280; // Spotify canvas height (9:16 ratio)
canvas.width = startingWidth;
canvas.height = startingHeight;
console.log("canvas width/height: "+canvas.width+" / "+canvas.height);

const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
let isPlaying = false;
let animationID = null;
let randomSeed;
let time;
let timeOffset = 0;

// FPS tracking variables
let frameCount = 0;
let lastTime = 0;
let fps = 0;
const fpsIndicator = document.getElementById('fpsIndicator');

if (!gl) {
    alert('WebGL not supported');
}

// Compile shaders
function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// Create program
const vertexShader = compileShader(document.getElementById('vertexShader').textContent, gl.VERTEX_SHADER);
const fragmentShader = compileShader(document.getElementById('fragmentShader').textContent, gl.FRAGMENT_SHADER);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// Create rectangle covering the entire canvas
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
     1.0,  1.0
]), gl.STATIC_DRAW);

// Set up attributes and uniforms
const positionLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const timeLocation = gl.getUniformLocation(program, 'time');
const resolutionLocation = gl.getUniformLocation(program, 'resolution');
const seedLocation = gl.getUniformLocation(program, 'seed');

// GUI-controlled uniform locations
const timeScaleLocation = gl.getUniformLocation(program, 'timeScale');
const bloomStrengthLocation = gl.getUniformLocation(program, 'bloomStrength');
const saturationLocation = gl.getUniformLocation(program, 'saturation');
const grainAmountLocation = gl.getUniformLocation(program, 'grainAmount');
const colorTintLocation = gl.getUniformLocation(program, 'colorTint');
const overlayColorLocation = gl.getUniformLocation(program, 'overlayColor');
const backgroundColorLocation = gl.getUniformLocation(program, 'backgroundColor');
const overlayOpacityLocation = gl.getUniformLocation(program, 'overlayOpacity');
const backgroundOpacityLocation = gl.getUniformLocation(program, 'backgroundOpacity');
const minCircleSizeLocation = gl.getUniformLocation(program, 'minCircleSize');
const circleStrengthLocation = gl.getUniformLocation(program, 'circleStrength');
const distortXLocation = gl.getUniformLocation(program, 'distortX');
const distortYLocation = gl.getUniformLocation(program, 'distortY');

const patternAmpLocation = gl.getUniformLocation(program, 'patternAmp');
const patternFreqLocation = gl.getUniformLocation(program, 'patternFreq');

// Audio context for visualization
let audioContext;
let audioAnalyser;
let audioDataArray;
let audioSourceNode;
let uploadedAudio;

// Smoothed audio values for less glitchy reactivity
let smoothedAudioData = {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0
};

// Smoothing parameters
const audioSmoothing = {
    factor: 0.15, // How much of the new value to use (lower = smoother)
    threshold: 0.02, // Minimum change required to update
    dampening: 0.95 // Gradual reduction when no strong signal
};

// Initialize parameters object for dat.gui
const params = {
    canvasWidth: startingWidth,
    canvasHeight: startingHeight,
    // Canvas format presets
    format: "spotify", // spotify, square, landscape
    timeScale: 0.4,
    patternAmp: 12.0,
    patternFreq: 0.5,
    bloomStrength: 1.0,
    saturation: 0.85,
    grainAmount: 0.2,
    colorTintR: 1.0,
    colorTintG: 1.0, 
    colorTintB: 1.0,
    // Overlay and background colors
    overlayColorR: 0.0,
    overlayColorG: 0.0,
    overlayColorB: 0.0,
    overlayOpacity: 0.0,
    backgroundColorR: 0.0,
    backgroundColorG: 0.0,
    backgroundColorB: 0.0,
    backgroundOpacity: 0.0,
    minCircleSize: 3.0,
    circleStrength: 1.0,
    distortX: 5.0,
    distortY: 20.0,
    // Audio reactive parameters
    audioReactive: false,
    audioSensitivity: 1.0,
    bassResponse: 1.0,
    midResponse: 0.5,
    trebleResponse: 0.3,
    audioSmoothing: 0.15, // Smoothing factor for audio reactivity
    audioIntensity: 0.7,  // Overall intensity multiplier
};

// Also refresh on page load
window.addEventListener('load', refreshPattern);

// Initialize dat.gui
const gui = new dat.GUI({ autoplace: false });
gui.close();

// Add GUI controls with folders for organization
const canvasFolder = gui.addFolder('Canvas Format');
canvasFolder.add(params, 'format', ['spotify', 'square', 'landscape']).name('Format').onChange(updateCanvasFormat);
canvasFolder.add(params, 'canvasWidth', 100, 4000).step(10).name('Width').onChange(updateCanvasSize);
canvasFolder.add(params, 'canvasHeight', 100, 4000).step(10).name('Height').onChange(updateCanvasSize);
canvasFolder.open();

const timeFolder = gui.addFolder('Animation');
timeFolder.add(params, 'timeScale', 0.1, 3.0).name('Speed').onChange(updateUniforms);
timeFolder.open();

const patternFolder = gui.addFolder('Pattern');
patternFolder.add(params, 'patternAmp', 1.0, 50.0).step(0.1).name('Pattern Amp').onChange(updateUniforms);
patternFolder.add(params, 'patternFreq', 0.2, 10.0).step(0.1).name('Pattern Freq').onChange(updateUniforms);
patternFolder.open();

const visualFolder = gui.addFolder('Visual Effects');
visualFolder.add(params, 'bloomStrength', 0.0, 5.0).name('Bloom').onChange(updateUniforms);
visualFolder.add(params, 'saturation', 0.0, 2.0).name('Saturation').onChange(updateUniforms);
visualFolder.add(params, 'grainAmount', 0.0, 0.5).name('Grain').onChange(updateUniforms);
visualFolder.add(params, 'minCircleSize', 0.0, 10.0).name('Circle Size').onChange(updateUniforms);
visualFolder.add(params, 'circleStrength', 0.0, 3.0).name('Circle Strength').onChange(updateUniforms);
visualFolder.add(params, 'distortX', 0.0, 50.0).name('Distort-X').onChange(updateUniforms);
visualFolder.add(params, 'distortY', 0.0, 50.0).name('Distort-Y').onChange(updateUniforms);

visualFolder.open();

const colorFolder = gui.addFolder('Color Tint');
colorFolder.add(params, 'colorTintR', 0.0, 1.5).name('Red').onChange(updateUniforms);
colorFolder.add(params, 'colorTintG', 0.0, 1.5).name('Green').onChange(updateUniforms);
colorFolder.add(params, 'colorTintB', 0.0, 1.5).name('Blue').onChange(updateUniforms);
colorFolder.open();

const audioFolder = gui.addFolder('Audio Reactive');
audioFolder.add(params, 'audioReactive').name('Enable Audio Reactive').onChange(updateUniforms);
audioFolder.add(params, 'audioSensitivity', 0.1, 3.0).name('Sensitivity').onChange(updateUniforms);
audioFolder.add(params, 'audioIntensity', 0.1, 2.0).name('Intensity').onChange(updateAudioSettings);
audioFolder.add(params, 'audioSmoothing', 0.05, 0.5).name('Smoothing').onChange(updateAudioSettings);
audioFolder.add(params, 'bassResponse', 0.0, 2.0).name('Bass Response').onChange(updateUniforms);
audioFolder.add(params, 'midResponse', 0.0, 2.0).name('Mid Response').onChange(updateUniforms);
audioFolder.add(params, 'trebleResponse', 0.0, 2.0).name('Treble Response').onChange(updateUniforms);

// Function to update shader uniforms from GUI values
function updateUniforms() {
    gl.uniform1f(timeScaleLocation, params.timeScale);
    gl.uniform1f(patternAmpLocation, params.patternAmp);
    gl.uniform1f(patternFreqLocation, params.patternFreq);
    gl.uniform1f(bloomStrengthLocation, params.bloomStrength);
    gl.uniform1f(saturationLocation, params.saturation);
    gl.uniform1f(grainAmountLocation, params.grainAmount);
    gl.uniform3f(colorTintLocation, params.colorTintR, params.colorTintG, params.colorTintB);
    gl.uniform3f(overlayColorLocation, params.overlayColorR, params.overlayColorG, params.overlayColorB);
    gl.uniform3f(backgroundColorLocation, params.backgroundColorR, params.backgroundColorG, params.backgroundColorB);
    gl.uniform1f(overlayOpacityLocation, params.overlayOpacity);
    gl.uniform1f(backgroundOpacityLocation, params.backgroundOpacity);
    gl.uniform1f(minCircleSizeLocation, params.minCircleSize);
    gl.uniform1f(circleStrengthLocation, params.circleStrength);
    gl.uniform1f(distortXLocation, params.distortX);
    gl.uniform1f(distortYLocation, params.distortY);
}

// Function to update audio settings
function updateAudioSettings() {
    // Update the smoothing factor dynamically
    audioSmoothing.factor = params.audioSmoothing;
}

function drawScene(){
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Animation loop
function render(timestamp) {
  if (isPlaying) {
      // Calculate adjusted time by subtracting the offset
      const adjustedTime = timestamp - timeOffset;
      time = timestamp;

      // Get audio data for reactive features
      const audioData = getAudioData();
      
      // Apply audio reactive modulation
      let modifiedTimeScale = params.timeScale;
      let modifiedBloom = params.bloomStrength;
      let modifiedDistortX = params.distortX;
      let modifiedDistortY = params.distortY;
      
      if (params.audioReactive && audioData.overall > 0) {
          // Apply intensity multiplier and reduced modulation amounts for smoother effects
          const intensity = params.audioIntensity;
          modifiedTimeScale += audioData.overall * 0.15 * intensity;  
          modifiedBloom += audioData.bass * 1.0 * intensity;          
          modifiedDistortX += audioData.mid * 5.0 * intensity;        
          modifiedDistortY += audioData.treble * 8.0 * intensity;     
      }

      const timeInSeconds = adjustedTime * 0.0035;
      gl.uniform1f(timeLocation, timeInSeconds);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      
      // Apply audio reactive uniforms
      gl.uniform1f(timeScaleLocation, modifiedTimeScale);
      gl.uniform1f(bloomStrengthLocation, modifiedBloom);
      gl.uniform1f(distortXLocation, modifiedDistortX);
      gl.uniform1f(distortYLocation, modifiedDistortY);
      
      // FPS calculation
      frameCount++;
      
      // Update FPS every 500ms
      if (time - lastTime >= 500) {
          // Calculate FPS: frameCount / timeDiff in seconds
          fps = Math.round((frameCount * 1000) / (time - lastTime));
          fpsIndicator.textContent = `FPS: ${fps}`;
          
          // Reset for next update
          frameCount = 0;
          lastTime = time;
      }
      
      // If video recording is ongoing, drawScene is called already
      if (!recordVideoState || useMobileRecord) {
        drawScene();
      }
      
      animationID = requestAnimationFrame(render);
  }
}

// Canvas format functions
function updateCanvasFormat() {
    switch(params.format) {
        case 'spotify':
            params.canvasWidth = 720;
            params.canvasHeight = 1280;
            break;
        case 'square':
            params.canvasWidth = 1000;
            params.canvasHeight = 1000;
            break;
        case 'landscape':
            params.canvasWidth = 1920;
            params.canvasHeight = 1080;
            break;
    }
    
    // Update GUI controllers to show new values
    for (let i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
    
    for (let f in gui.__folders) {
        const folder = gui.__folders[f];
        for (let i in folder.__controllers) {
            folder.__controllers[i].updateDisplay();
        }
    }
    
    updateCanvasSize();
}

// Audio reactive functions
function setupAudioContext(audioElement) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (!audioAnalyser) {
        audioAnalyser = audioContext.createAnalyser();
        // Better settings for smoother analysis
        audioAnalyser.fftSize = 512;  // Higher resolution for better frequency analysis
        audioAnalyser.smoothingTimeConstant = 0.8; // Built-in smoothing (0-1, higher = more smoothing)
        audioAnalyser.minDecibels = -90; // Better dynamic range
        audioAnalyser.maxDecibels = -10;
        audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    }
    
    if (audioSourceNode) {
        audioSourceNode.disconnect();
    }
    
    audioSourceNode = audioContext.createMediaElementSource(audioElement);
    audioSourceNode.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);
}

function getAudioData() {
    if (!audioAnalyser || !params.audioReactive) {
        // Gradually reduce smoothed values when audio reactive is off
        smoothedAudioData.bass *= audioSmoothing.dampening;
        smoothedAudioData.mid *= audioSmoothing.dampening;
        smoothedAudioData.treble *= audioSmoothing.dampening;
        smoothedAudioData.overall *= audioSmoothing.dampening;
        return smoothedAudioData;
    }
    
    audioAnalyser.getByteFrequencyData(audioDataArray);
    
    const bassRange = Math.floor(audioDataArray.length * 0.15); // Slightly larger bass range
    const midRange = Math.floor(audioDataArray.length * 0.6);  // Better mid range
    const trebleRange = audioDataArray.length;
    
    let bass = 0, mid = 0, treble = 0;
    
    // Calculate bass with weighted averaging (emphasize lower frequencies)
    for (let i = 0; i < bassRange; i++) {
        const weight = 1.0 - (i / bassRange) * 0.5; // Higher weight for lower frequencies
        bass += audioDataArray[i] * weight;
    }
    bass /= bassRange;
    
    // Calculate mids
    for (let i = bassRange; i < midRange; i++) {
        mid += audioDataArray[i];
    }
    mid /= (midRange - bassRange);
    
    // Calculate treble with weighted averaging (emphasize higher frequencies)
    for (let i = midRange; i < trebleRange; i++) {
        const weight = 0.5 + (i - midRange) / (trebleRange - midRange) * 0.5;
        treble += audioDataArray[i] * weight;
    }
    treble /= (trebleRange - midRange);
    
    // Normalize to 0-1 range
    bass = Math.min(1.0, bass / 255);
    mid = Math.min(1.0, mid / 255);
    treble = Math.min(1.0, treble / 255);
    const overall = (bass + mid + treble) / 3;
    
    // Apply response multipliers
    const rawData = {
        bass: bass * params.bassResponse,
        mid: mid * params.midResponse,
        treble: treble * params.trebleResponse,
        overall: overall * params.audioSensitivity
    };
    
    // Apply exponential smoothing to reduce spastic behavior
    smoothedAudioData.bass = smoothValue(smoothedAudioData.bass, rawData.bass);
    smoothedAudioData.mid = smoothValue(smoothedAudioData.mid, rawData.mid);
    smoothedAudioData.treble = smoothValue(smoothedAudioData.treble, rawData.treble);
    smoothedAudioData.overall = smoothValue(smoothedAudioData.overall, rawData.overall);
    
    return smoothedAudioData;
}

// Exponential smoothing function with threshold and dampening
function smoothValue(currentValue, newValue) {
    const difference = Math.abs(newValue - currentValue);
    
    // Only apply smoothing if the change is significant enough
    if (difference < audioSmoothing.threshold) {
        return currentValue * audioSmoothing.dampening;
    }
    
    // Use exponential smoothing: newSmoothed = oldSmoothed + α * (newValue - oldSmoothed)
    return currentValue + audioSmoothing.factor * (newValue - currentValue);
}

// Spotify Canvas presets
const canvasPresets = {
    ambient: {
        timeScale: 0.2,
        patternAmp: 8.0,
        patternFreq: 0.3,
        bloomStrength: 1.5,
        saturation: 0.7,
        grainAmount: 0.1,
        colorTintR: 0.8,
        colorTintG: 1.0,
        colorTintB: 1.2,
        overlayColorR: 0.2,
        overlayColorG: 0.4,
        overlayColorB: 0.8,
        overlayOpacity: 0.15,
        backgroundColorR: 0.05,
        backgroundColorG: 0.1,
        backgroundColorB: 0.2,
        backgroundOpacity: 0.3,
        minCircleSize: 2.0,
        circleStrength: 0.8,
        distortX: 3.0,
        distortY: 15.0
    },
    energetic: {
        timeScale: 1.2,
        patternAmp: 25.0,
        patternFreq: 1.5,
        bloomStrength: 2.5,
        saturation: 1.3,
        grainAmount: 0.3,
        colorTintR: 1.2,
        colorTintG: 0.8,
        colorTintB: 0.6,
        overlayColorR: 1.0,
        overlayColorG: 0.3,
        overlayColorB: 0.1,
        overlayOpacity: 0.2,
        backgroundColorR: 0.1,
        backgroundColorG: 0.05,
        backgroundColorB: 0.0,
        backgroundOpacity: 0.4,
        minCircleSize: 5.0,
        circleStrength: 2.0,
        distortX: 15.0,
        distortY: 35.0
    },
    minimal: {
        timeScale: 0.3,
        patternAmp: 5.0,
        patternFreq: 0.4,
        bloomStrength: 0.8,
        saturation: 0.6,
        grainAmount: 0.05,
        colorTintR: 0.9,
        colorTintG: 0.9,
        colorTintB: 0.9,
        overlayColorR: 0.8,
        overlayColorG: 0.8,
        overlayColorB: 0.8,
        overlayOpacity: 0.1,
        backgroundColorR: 0.95,
        backgroundColorG: 0.95,
        backgroundColorB: 0.95,
        backgroundOpacity: 0.2,
        minCircleSize: 1.5,
        circleStrength: 0.5,
        distortX: 2.0,
        distortY: 8.0
    },
    abstract: {
        timeScale: 0.6,
        patternAmp: 18.0,
        patternFreq: 0.8,
        bloomStrength: 1.8,
        saturation: 1.1,
        grainAmount: 0.15,
        colorTintR: 1.1,
        colorTintG: 1.1,
        colorTintB: 0.9,
        overlayColorR: 0.8,
        overlayColorG: 0.2,
        overlayColorB: 0.9,
        overlayOpacity: 0.18,
        backgroundColorR: 0.2,
        backgroundColorG: 0.1,
        backgroundColorB: 0.3,
        backgroundOpacity: 0.25,
        minCircleSize: 4.0,
        circleStrength: 1.3,
        distortX: 8.0,
        distortY: 25.0
    },
    retro: {
        timeScale: 0.5,
        patternAmp: 15.0,
        patternFreq: 0.6,
        bloomStrength: 2.0,
        saturation: 1.4,
        grainAmount: 0.25,
        colorTintR: 1.3,
        colorTintG: 0.7,
        colorTintB: 1.1,
        overlayColorR: 1.0,
        overlayColorG: 0.0,
        overlayColorB: 1.0,
        overlayOpacity: 0.22,
        backgroundColorR: 0.1,
        backgroundColorG: 0.0,
        backgroundColorB: 0.2,
        backgroundOpacity: 0.35,
        minCircleSize: 3.5,
        circleStrength: 1.5,
        distortX: 12.0,
        distortY: 28.0
    },
    organic: {
        timeScale: 0.35,
        patternAmp: 10.0,
        patternFreq: 0.45,
        bloomStrength: 1.2,
        saturation: 0.9,
        grainAmount: 0.12,
        colorTintR: 0.9,
        colorTintG: 1.2,
        colorTintB: 0.8,
        overlayColorR: 0.4,
        overlayColorG: 0.8,
        overlayColorB: 0.3,
        overlayOpacity: 0.12,
        backgroundColorR: 0.05,
        backgroundColorG: 0.15,
        backgroundColorB: 0.08,
        backgroundOpacity: 0.28,
        minCircleSize: 2.8,
        circleStrength: 1.0,
        distortX: 6.0,
        distortY: 20.0
    }
};

function applyPreset(presetName) {
    const preset = canvasPresets[presetName];
    if (!preset) return;
    
    Object.keys(preset).forEach(key => {
        if (params.hasOwnProperty(key)) {
            params[key] = preset[key];
        }
    });
    
    // Update GUI controllers to reflect new values
    for (let i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
    
    for (let f in gui.__folders) {
        const folder = gui.__folders[f];
        for (let i in folder.__controllers) {
            folder.__controllers[i].updateDisplay();
        }
    }
    
    updateUniforms();
    refreshPattern();
}

// Start the animation loop
isPlaying = true;
refreshPattern();
updateUniforms();
animationID = requestAnimationFrame(render);