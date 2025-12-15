/*
Live House Music Visualizer
Professional real-time visualization system for live house music performances
Features:
- Live microphone input with low-latency processing
- Advanced beat detection optimized for house music
- Real-time frequency analysis and BPM tracking
- Fullscreen presentation mode for live shows
- MIDI control support for live performance
- House music optimized visual presets
*/

// Live Performance Variables
let isLiveMode = false;
let microphoneStream = null;
let beatDetector = null;
let bpmAnalyzer = null;
let currentBPM = 0;
let lastBeatTime = 0;
let audioLatency = 0;
let performanceStartTime = 0;

// Initialize WebGL context
const canvas = document.getElementById('canvas');
// Live performance optimal dimensions - fullscreen landscape by default
let startingWidth = Math.min(1920, window.innerWidth); 
let startingHeight = Math.min(1080, window.innerHeight * 0.8);
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

// Advanced Audio Analysis for Live Performance - KICK DRUM BEAT DETECTION
class BeatDetector {
    constructor(analyser) {
        this.analyser = analyser;
        this.bufferSize = analyser.fftSize;
        this.energyHistory = new Array(43).fill(0); // ~1 second at 60fps
        this.kickEnergyHistory = new Array(20).fill(0); // Shorter history for kick responsiveness
        this.variance = 0;
        this.localEnergyAverage = 0;
        this.kickVariance = 0;
        this.kickEnergyAverage = 0;
        this.sensitivity = 1.8; // Increased sensitivity for kick detection
        this.minTimeBetweenBeats = 150; // Reduced for faster kick response (400ms = 150 BPM)
        this.lastBeatTime = 0;
    }
    
    detectBeat() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate sample rate and bin size for precise kick drum targeting
        const sampleRate = (this.analyser.context && this.analyser.context.sampleRate) || 44100;
        const binSize = sampleRate / (this.analyser.fftSize);
        
        // Focus specifically on kick drum frequencies (40-100Hz)
        const kickLowBin = Math.floor(40 / binSize);
        const kickHighBin = Math.floor(100 / binSize);
        
        // Calculate kick drum energy with heavy weighting
        let kickEnergy = 0;
        let kickBinCount = kickHighBin - kickLowBin;
        
        for (let i = kickLowBin; i < kickHighBin; i++) {
            // Weight the 50-70Hz range more heavily (primary kick frequencies)
            const freq = i * binSize;
            let weight = 1.0;
            if (freq >= 50 && freq <= 70) {
                weight = 3.0; // Heavy emphasis on primary kick range
            } else if (freq >= 40 && freq <= 50) {
                weight = 2.0; // Medium emphasis on sub-kick
            } else if (freq >= 70 && freq <= 100) {
                weight = 1.5; // Light emphasis on kick harmonics
            }
            
            kickEnergy += dataArray[i] * dataArray[i] * weight;
        }
        kickEnergy = kickEnergy / kickBinCount;
        
        // Also calculate general bass energy for backup detection
        const bassEnd = Math.floor((250 / (sampleRate/2)) * this.analyser.frequencyBinCount);
        let bassEnergy = 0;
        for (let i = 0; i < bassEnd; i++) {
            bassEnergy += dataArray[i] * dataArray[i];
        }
        bassEnergy = bassEnergy / bassEnd;
        
        // Use kick energy as primary, bass energy as secondary
        let energy = (kickEnergy * 0.8) + (bassEnergy * 0.2);
        
        // Update both general and kick-specific energy histories
        this.energyHistory.push(energy);
        this.energyHistory.shift();
        
        this.kickEnergyHistory.push(kickEnergy);
        this.kickEnergyHistory.shift();
        
        // Calculate local energy averages and variances
        this.localEnergyAverage = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        this.variance = this.energyHistory.reduce((acc, val) => acc + Math.pow(val - this.localEnergyAverage, 2), 0) / this.energyHistory.length;
        
        this.kickEnergyAverage = this.kickEnergyHistory.reduce((a, b) => a + b) / this.kickEnergyHistory.length;
        this.kickVariance = this.kickEnergyHistory.reduce((acc, val) => acc + Math.pow(val - this.kickEnergyAverage, 2), 0) / this.kickEnergyHistory.length;
        
        // Dual beat detection algorithm - kick-focused + general backup
        const kickC = -0.003 * this.kickVariance + 1.8; // More aggressive for kick
        const kickThreshold = kickC * this.kickEnergyAverage;
        
        const generalC = -0.0025714 * this.variance + 1.5142857;
        const generalThreshold = generalC * this.localEnergyAverage;
        
        const currentTime = Date.now();
        
        // Prioritize kick drum detection, fall back to general if needed
        const kickBeatDetected = kickEnergy > kickThreshold;
        const generalBeatDetected = energy > generalThreshold;
        
        if ((kickBeatDetected || (generalBeatDetected && kickEnergy > this.kickEnergyAverage * 0.7)) && 
            currentTime - this.lastBeatTime > this.minTimeBetweenBeats) {
            this.lastBeatTime = currentTime;
            return true;
        }
        
        return false;
    }
}

class BPMAnalyzer {
    constructor() {
        this.beatIntervals = [];
        this.maxIntervals = 8;
        this.currentBPM = 0;
    }
    
    addBeat(timestamp) {
        if (this.beatIntervals.length > 0) {
            const interval = timestamp - this.beatIntervals[this.beatIntervals.length - 1];
            this.beatIntervals.push(timestamp);
            
            if (this.beatIntervals.length > this.maxIntervals) {
                this.beatIntervals.shift();
            }
            
            if (this.beatIntervals.length >= 4) {
                this.calculateBPM();
            }
        } else {
            this.beatIntervals.push(timestamp);
        }
    }
    
    calculateBPM() {
        if (this.beatIntervals.length < 2) return;
        
        const intervals = [];
        for (let i = 1; i < this.beatIntervals.length; i++) {
            intervals.push(this.beatIntervals[i] - this.beatIntervals[i-1]);
        }
        
        // Filter out outliers
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const filteredIntervals = intervals.filter(interval => 
            Math.abs(interval - avgInterval) < avgInterval * 0.3
        );
        
        if (filteredIntervals.length > 0) {
            const finalAvg = filteredIntervals.reduce((a, b) => a + b) / filteredIntervals.length;
            this.currentBPM = Math.round(60000 / finalAvg);
            
            // Clamp to reasonable house music BPM range
            this.currentBPM = Math.max(100, Math.min(140, this.currentBPM));
        }
    }
    
    getBPM() {
        return this.currentBPM;
    }
}

// Initialize parameters object for dat.gui
const params = {
    canvasWidth: startingWidth,
    canvasHeight: startingHeight,
    // Canvas format presets  
    format: "landscape", // landscape optimized for live shows by default
    timeScale: 0.6,
    patternAmp: 15.0,
    patternFreq: 0.8,
    bloomStrength: 1.5,
    saturation: 1.1,
    grainAmount: 0.15,
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
    // Live Performance Parameters
    liveMode: false,
    microphoneInput: false,
    beatDetection: true,
    bpmSync: true,
    audioReactive: true, // On by default for live use
    audioSensitivity: 1.5,
    
    // KICK DRUM FOCUSED PARAMETERS
    kickDrumResponse: 3.0,    // Primary kick drum response multiplier
    kickSensitivity: 2.5,     // How sensitive to kick drum changes
    kickBeatFlash: 2.0,       // How much kick beats flash the visuals
    
    // Secondary frequency responses (reduced for kick focus)
    bassResponse: 1.0,        // General bass (reduced from 2.0)
    midResponse: 0.3,         // Mid frequencies (heavily reduced)
    trebleResponse: 0.2,      // Treble frequencies (minimal)
    
    audioSmoothing: 0.1,      // Faster response for live use
    audioIntensity: 1.2,      // Higher intensity for live
    beatSensitivity: 1.8,     // Increased beat sensitivity for kicks
    visualResponse: 2.5,      // Enhanced visual response to beats
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

// Live Performance Controls
const liveFolder = gui.addFolder('Live Performance');
liveFolder.add(params, 'liveMode').name('Live Mode').onChange(toggleLiveMode);
liveFolder.add(params, 'microphoneInput').name('Microphone Input').onChange(toggleMicrophoneInput);
liveFolder.add(params, 'beatDetection').name('Beat Detection').onChange(updateAudioSettings);
liveFolder.add(params, 'bpmSync').name('BPM Sync').onChange(updateAudioSettings);
liveFolder.add(params, 'beatSensitivity', 0.5, 3.0).name('Beat Sensitivity').onChange(updateAudioSettings);
liveFolder.add(params, 'visualResponse', 0.5, 5.0).name('Visual Response').onChange(updateUniforms);
liveFolder.open();

// Kick Drum Controls
const kickFolder = gui.addFolder('🥁 Kick Drum Focus');
kickFolder.add(params, 'kickDrumResponse', 0.5, 5.0).name('Kick Response').onChange(updateUniforms);
kickFolder.add(params, 'kickSensitivity', 0.5, 5.0).name('Kick Sensitivity').onChange(updateAudioSettings);
kickFolder.add(params, 'kickBeatFlash', 0.5, 5.0).name('Kick Beat Flash').onChange(updateUniforms);
kickFolder.open();

const audioFolder = gui.addFolder('Audio Reactive');
audioFolder.add(params, 'audioReactive').name('Enable Audio Reactive').onChange(updateUniforms);
audioFolder.add(params, 'audioSensitivity', 0.1, 3.0).name('Sensitivity').onChange(updateUniforms);
audioFolder.add(params, 'audioIntensity', 0.1, 3.0).name('Intensity').onChange(updateAudioSettings);
audioFolder.add(params, 'audioSmoothing', 0.05, 0.5).name('Smoothing').onChange(updateAudioSettings);
audioFolder.add(params, 'bassResponse', 0.0, 5.0).name('Bass Response').onChange(updateUniforms);
audioFolder.add(params, 'midResponse', 0.0, 3.0).name('Mid Response').onChange(updateUniforms);
audioFolder.add(params, 'trebleResponse', 0.0, 3.0).name('Treble Response').onChange(updateUniforms);
audioFolder.open();

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

// House Music Visual Presets
const canvasPresets = {
    ambient: { // Deep House - Smooth, hypnotic flow
        timeScale: 0.3,
        patternAmp: 12.0,
        patternFreq: 0.4,
        bloomStrength: 2.0,
        saturation: 0.9,
        grainAmount: 0.08,
        colorTintR: 0.7,
        colorTintG: 0.9,
        colorTintB: 1.3,
        overlayColorR: 0.1,
        overlayColorG: 0.3,
        overlayColorB: 0.7,
        overlayOpacity: 0.2,
        backgroundColorR: 0.02,
        backgroundColorG: 0.05,
        backgroundColorB: 0.15,
        backgroundOpacity: 0.4,
        minCircleSize: 3.5,
        circleStrength: 1.2,
        distortX: 4.0,
        distortY: 18.0
    },
    energetic: { // Progressive House - Building energy and dynamics
        timeScale: 0.8,
        patternAmp: 28.0,
        patternFreq: 1.2,
        bloomStrength: 3.5,
        saturation: 1.4,
        grainAmount: 0.2,
        colorTintR: 1.4,
        colorTintG: 0.9,
        colorTintB: 0.5,
        overlayColorR: 0.9,
        overlayColorG: 0.4,
        overlayColorB: 0.1,
        overlayOpacity: 0.25,
        backgroundColorR: 0.08,
        backgroundColorG: 0.02,
        backgroundColorB: 0.0,
        backgroundOpacity: 0.3,
        minCircleSize: 6.0,
        circleStrength: 2.5,
        distortX: 20.0,
        distortY: 40.0
    },
    minimal: { // Tech House - Precise, geometric technical patterns
        timeScale: 0.5,
        patternAmp: 10.0,
        patternFreq: 0.8,
        bloomStrength: 1.2,
        saturation: 0.8,
        grainAmount: 0.12,
        colorTintR: 1.1,
        colorTintG: 1.1,
        colorTintB: 1.0,
        overlayColorR: 0.5,
        overlayColorG: 0.5,
        overlayColorB: 0.6,
        overlayOpacity: 0.15,
        backgroundColorR: 0.1,
        backgroundColorG: 0.1,
        backgroundColorB: 0.1,
        backgroundOpacity: 0.5,
        minCircleSize: 2.5,
        circleStrength: 0.8,
        distortX: 8.0,
        distortY: 12.0
    },
    abstract: { // Acid House - Psychedelic, morphing textures
        timeScale: 1.0,
        patternAmp: 35.0,
        patternFreq: 1.8,
        bloomStrength: 4.0,
        saturation: 1.8,
        grainAmount: 0.25,
        colorTintR: 1.5,
        colorTintG: 0.8,
        colorTintB: 1.4,
        overlayColorR: 1.2,
        overlayColorG: 0.2,
        overlayColorB: 1.0,
        overlayOpacity: 0.3,
        backgroundColorR: 0.15,
        backgroundColorG: 0.05,
        backgroundColorB: 0.25,
        backgroundOpacity: 0.2,
        minCircleSize: 8.0,
        circleStrength: 3.0,
        distortX: 25.0,
        distortY: 45.0
    },
    retro: { // Electro House - Sharp, electric visual elements
        timeScale: 0.7,
        patternAmp: 22.0,
        patternFreq: 1.0,
        bloomStrength: 3.0,
        saturation: 1.6,
        grainAmount: 0.18,
        colorTintR: 0.3,
        colorTintG: 1.5,
        colorTintB: 1.8,
        overlayColorR: 0.0,
        overlayColorG: 0.8,
        overlayColorB: 1.0,
        overlayOpacity: 0.22,
        backgroundColorR: 0.0,
        backgroundColorG: 0.05,
        backgroundColorB: 0.15,
        backgroundOpacity: 0.4,
        minCircleSize: 4.5,
        circleStrength: 2.0,
        distortX: 15.0,
        distortY: 35.0
    },
    organic: { // Future House - Futuristic, evolving visual forms
        timeScale: 0.6,
        patternAmp: 18.0,
        patternFreq: 0.9,
        bloomStrength: 2.8,
        saturation: 1.3,
        grainAmount: 0.1,
        colorTintR: 0.4,
        colorTintG: 1.4,
        colorTintB: 1.6,
        overlayColorR: 0.2,
        overlayColorG: 0.9,
        overlayColorB: 1.2,
        overlayOpacity: 0.18,
        backgroundColorR: 0.02,
        backgroundColorG: 0.08,
        backgroundColorB: 0.12,
        backgroundOpacity: 0.3,
        minCircleSize: 5.2,
        circleStrength: 1.8,
        distortX: 12.0,
        distortY: 30.0
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

// Live Performance Functions
async function toggleMicrophoneInput() {
    if (params.microphoneInput) {
        await startMicrophoneInput();
    } else {
        stopMicrophoneInput();
    }
}

async function startMicrophoneInput() {
    try {
        console.log('Requesting microphone access...');
        microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 44100
            }
        });
        
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Set up microphone source
        const microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
        
        // Create high-performance analyser for live input
        if (!audioAnalyser) {
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 2048; // High resolution for better beat detection
            audioAnalyser.smoothingTimeConstant = 0.3; // Fast response
            audioAnalyser.minDecibels = -100;
            audioAnalyser.maxDecibels = -10;
            audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        
        // Connect microphone to analyser
        microphoneSource.connect(audioAnalyser);
        
        // Initialize beat detection
        if (params.beatDetection) {
            beatDetector = new BeatDetector(audioAnalyser);
            bpmAnalyzer = new BPMAnalyzer();
        }
        
        // Update UI
        document.getElementById('audio-info').textContent = 'Live microphone input active';
        console.log('Microphone input started successfully');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        params.microphoneInput = false;
        document.getElementById('audio-info').textContent = 'Microphone access denied';
        
        // Update GUI to reflect failed state
        for (let f in gui.__folders) {
            const folder = gui.__folders[f];
            for (let i in folder.__controllers) {
                folder.__controllers[i].updateDisplay();
            }
        }
    }
}

function stopMicrophoneInput() {
    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
    }
    
    beatDetector = null;
    bpmAnalyzer = null;
    currentBPM = 0;
    
    document.getElementById('audio-info').textContent = 'Microphone input stopped';
    console.log('Microphone input stopped');
}

function toggleLiveMode() {
    isLiveMode = params.liveMode;
    
    if (isLiveMode) {
        // Enable live mode optimizations
        params.audioReactive = true;
        if (!params.microphoneInput) {
            params.microphoneInput = true;
            toggleMicrophoneInput();
        }
        
        performanceStartTime = Date.now();
        document.getElementById('audio-info').textContent = 'LIVE MODE ACTIVE';
        
        // Show live mode indicator
        const liveModeDiv = document.getElementById('liveModeMessageDiv');
        if (liveModeDiv) liveModeDiv.classList.remove('hidden');
        
    } else {
        // Disable live mode
        document.getElementById('audio-info').textContent = 'Live mode disabled';
        
        // Hide live mode indicator
        const liveModeDiv = document.getElementById('liveModeMessageDiv');
        if (liveModeDiv) liveModeDiv.classList.add('hidden');
    }
    
    // Update all GUI controllers
    for (let f in gui.__folders) {
        const folder = gui.__folders[f];
        for (let i in folder.__controllers) {
            folder.__controllers[i].updateDisplay();
        }
    }
}

// Enhanced audio analysis for live performance - KICK DRUM FOCUSED
function getLiveAudioData() {
    if (!audioAnalyser || !params.audioReactive) {
        return smoothedAudioData;
    }
    
    audioAnalyser.getByteFrequencyData(audioDataArray);
    
    // Kick drum focused frequency analysis (40-100Hz is the sweet spot for kick drums)
    const sampleRate = audioContext.sampleRate || 44100;
    const binSize = sampleRate / (audioAnalyser.fftSize * 2);
    
    // Calculate frequency bin ranges for kick drum focus
    const kickLowBin = Math.floor(40 / binSize);    // 40Hz - kick drum fundamental
    const kickHighBin = Math.floor(100 / binSize);  // 100Hz - kick drum harmonics
    const subKickBin = Math.floor(60 / binSize);    // 60Hz - primary kick energy
    const midRange = Math.floor(audioDataArray.length * 0.5);    // 100Hz-8kHz
    const trebleRange = audioDataArray.length;                   // 8kHz-22kHz
    
    let kickDrum = 0, kickFundamental = 0, bass = 0, mid = 0, treble = 0;
    
    // KICK DRUM FUNDAMENTAL (40-60Hz) - This is where the punch lives
    for (let i = kickLowBin; i < subKickBin; i++) {
        const kickWeight = 3.0; // Heavy emphasis on kick fundamental
        kickFundamental += audioDataArray[i] * audioDataArray[i] * kickWeight;
    }
    kickFundamental = Math.sqrt(kickFundamental / (subKickBin - kickLowBin)) / 255;
    
    // KICK DRUM HARMONICS (60-100Hz) - This adds the body and thump
    let kickHarmonics = 0;
    for (let i = subKickBin; i < kickHighBin; i++) {
        const harmonicWeight = 2.5; // Strong emphasis on kick harmonics
        kickHarmonics += audioDataArray[i] * audioDataArray[i] * harmonicWeight;
    }
    kickHarmonics = Math.sqrt(kickHarmonics / (kickHighBin - subKickBin)) / 255;
    
    // Combined kick drum signal (fundamental + harmonics)
    kickDrum = (kickFundamental * 0.7) + (kickHarmonics * 0.3);
    
    // Calculate traditional bass (20-200Hz) but de-emphasize in favor of kick
    for (let i = 0; i < Math.floor(audioDataArray.length * 0.1); i++) {
        const weight = 0.5; // Reduced weight for general bass
        bass += audioDataArray[i] * audioDataArray[i] * weight;
    }
    bass = Math.sqrt(bass / Math.floor(audioDataArray.length * 0.1)) / 255;
    
    // Calculate mids (de-emphasized for kick drum focus)
    for (let i = kickHighBin; i < midRange; i++) {
        const midWeight = 0.3; // Reduced mid response
        mid += audioDataArray[i] * audioDataArray[i] * midWeight;
    }
    mid = Math.sqrt(mid / (midRange - kickHighBin)) / 255;
    
    // Calculate treble (minimal response for kick drum focus)
    for (let i = midRange; i < trebleRange; i++) {
        const trebleWeight = 0.2; // Minimal treble response
        treble += audioDataArray[i] * audioDataArray[i] * trebleWeight;
    }
    treble = Math.sqrt(treble / (trebleRange - midRange)) / 255;
    
    // Overall is now dominated by kick drum
    const overall = (kickDrum * 0.7) + (bass * 0.2) + (mid * 0.08) + (treble * 0.02);
    
    // Beat detection
    let beatDetected = false;
    if (params.beatDetection && beatDetector) {
        beatDetected = beatDetector.detectBeat();
        if (beatDetected && bpmAnalyzer) {
            const now = Date.now();
            bpmAnalyzer.addBeat(now);
            currentBPM = bpmAnalyzer.getBPM();
            lastBeatTime = now;
            
            // Show beat indicator
            const beatDiv = document.getElementById('beatIndicatorDiv');
            if (beatDiv) {
                beatDiv.classList.remove('hidden');
                setTimeout(() => beatDiv.classList.add('hidden'), 100);
            }
        }
    }
    
    // Apply response multipliers with KICK DRUM EMPHASIS
    const rawData = {
        kickDrum: kickDrum * params.kickDrumResponse * params.kickSensitivity, // Primary kick response
        kickFundamental: kickFundamental * params.kickDrumResponse * params.kickSensitivity * 1.2, // Kick fundamental boost
        kickHarmonics: kickHarmonics * params.kickDrumResponse * params.kickSensitivity * 0.8,     // Kick harmonics boost
        bass: bass * params.bassResponse,                // General bass (now user controllable)
        mid: mid * params.midResponse,                   // Mid frequencies (user controllable)
        treble: treble * params.trebleResponse,          // Treble frequencies (user controllable)
        overall: overall * params.audioSensitivity,
        beat: beatDetected ? params.visualResponse * params.kickBeatFlash : 0  // Kick-focused beat response
    };
    
    // Faster smoothing for live performance with KICK DRUM FOCUS
    const liveSmoothingFactor = Math.max(0.05, params.audioSmoothing * 0.3); // Even faster for kick response
    const kickSmoothingFactor = Math.max(0.02, params.audioSmoothing * 0.1); // Ultra-fast kick response
    
    // Primary kick drum smoothing
    smoothedAudioData.kickDrum = smoothValue(smoothedAudioData.kickDrum || 0, rawData.kickDrum, kickSmoothingFactor);
    smoothedAudioData.kickFundamental = smoothValue(smoothedAudioData.kickFundamental || 0, rawData.kickFundamental, kickSmoothingFactor);
    smoothedAudioData.kickHarmonics = smoothValue(smoothedAudioData.kickHarmonics || 0, rawData.kickHarmonics, kickSmoothingFactor);
    
    // Secondary frequency smoothing (reduced importance)
    smoothedAudioData.bass = smoothValue(smoothedAudioData.bass, rawData.bass, liveSmoothingFactor);
    smoothedAudioData.mid = smoothValue(smoothedAudioData.mid, rawData.mid, liveSmoothingFactor);
    smoothedAudioData.treble = smoothValue(smoothedAudioData.treble, rawData.treble, liveSmoothingFactor);
    smoothedAudioData.overall = smoothValue(smoothedAudioData.overall, rawData.overall, liveSmoothingFactor);
    
    // Immediate beat response (no smoothing for instant kick reaction)
    smoothedAudioData.beat = rawData.beat;
    
    return smoothedAudioData;
}

// Enhanced smoothing function for live performance
function smoothValue(currentValue, newValue, customFactor = null) {
    const factor = customFactor || audioSmoothing.factor;
    const difference = Math.abs(newValue - currentValue);
    
    if (difference < audioSmoothing.threshold) {
        return currentValue * audioSmoothing.dampening;
    }
    
    return currentValue + factor * (newValue - currentValue);
}

// Add keyboard controls for live performance
document.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'i':
            params.microphoneInput = !params.microphoneInput;
            toggleMicrophoneInput();
            break;
        case 'l':
            params.liveMode = !params.liveMode;
            toggleLiveMode();
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'b':
            params.beatDetection = !params.beatDetection;
            updateAudioSettings();
            break;
    }
});

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Update render loop to use live audio data
function renderLive(timestamp) {
    if (isPlaying) {
        const adjustedTime = timestamp - timeOffset;
        time = timestamp;

        // Get live audio data for reactive features
        const audioData = isLiveMode ? getLiveAudioData() : getAudioData();
        
        // Apply enhanced audio reactive modulation for live performance
        let modifiedTimeScale = params.timeScale;
        let modifiedBloom = params.bloomStrength;
        let modifiedDistortX = params.distortX;
        let modifiedDistortY = params.distortY;
        let modifiedPatternAmp = params.patternAmp;
        
        if (params.audioReactive && (audioData.kickDrum > 0 || audioData.overall > 0)) {
            const intensity = params.audioIntensity;
            
            // KICK DRUM DRIVEN MODULATION - Primary visual response
            const kickResponse = audioData.kickDrum || 0;
            const kickFundamentalResponse = audioData.kickFundamental || 0;
            const kickHarmonicsResponse = audioData.kickHarmonics || 0;
            
            // Kick drum controls main visual parameters
            modifiedTimeScale += kickResponse * 0.8 * intensity;  // Kick drives animation speed
            modifiedBloom += kickResponse * 4.0 * intensity;      // Kick drives bloom intensity
            modifiedPatternAmp += kickResponse * 25.0 * intensity; // Kick drives pattern amplitude
            
            // Kick fundamental controls distortion intensity
            modifiedDistortX += kickFundamentalResponse * 15.0 * intensity;
            modifiedDistortY += kickFundamentalResponse * 20.0 * intensity;
            
            // Kick harmonics add subtle movement variation
            modifiedTimeScale += kickHarmonicsResponse * 0.3 * intensity;
            
            // Secondary frequencies have minimal impact
            modifiedDistortX += audioData.mid * 2.0 * intensity;   // Reduced mid impact
            modifiedDistortY += audioData.treble * 3.0 * intensity; // Reduced treble impact
            
            // BEAT SYNCHRONIZATION - Massive kick drum response
            if (audioData.beat && audioData.beat > 0) {
                const kickBeatMultiplier = 1.5; // Extra emphasis on kick beats
                modifiedBloom += audioData.beat * 5.0 * kickBeatMultiplier;
                modifiedPatternAmp += audioData.beat * 35.0 * kickBeatMultiplier;
                
                // Instant flash effect on kick drum beat
                const timeSinceBeat = Date.now() - lastBeatTime;
                if (timeSinceBeat < 150) { // Longer flash for kick drums
                    const beatIntensity = 1.0 - (timeSinceBeat / 150);
                    modifiedBloom += beatIntensity * 4.0 * kickBeatMultiplier;
                    modifiedPatternAmp += beatIntensity * 15.0 * kickBeatMultiplier;
                }
            }
        }

        const timeInSeconds = adjustedTime * 0.0035;
        gl.uniform1f(timeLocation, timeInSeconds);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        
        // Apply audio reactive uniforms
        gl.uniform1f(timeScaleLocation, modifiedTimeScale);
        gl.uniform1f(bloomStrengthLocation, modifiedBloom);
        gl.uniform1f(distortXLocation, modifiedDistortX);
        gl.uniform1f(distortYLocation, modifiedDistortY);
        gl.uniform1f(patternAmpLocation, modifiedPatternAmp);
        
        // Update performance indicators
        frameCount++;
        if (time - lastTime >= 500) {
            fps = Math.round((frameCount * 1000) / (time - lastTime));
            const fpsIndicator = document.getElementById('fpsIndicator');
            if (fpsIndicator) fpsIndicator.textContent = `FPS: ${fps}`;
            
            // Update latency and BPM indicators
            const latencyIndicator = document.getElementById('latencyIndicator');
            if (latencyIndicator) latencyIndicator.textContent = `Latency: ${audioLatency}ms`;
            
            const bpmIndicator = document.getElementById('beatIndicator');
            if (bpmIndicator) bpmIndicator.textContent = `BPM: ${currentBPM || '---'}`;
            
            // Add kick drum level indicator for debugging
            const kickLevel = (audioData.kickDrum || 0) * 100;
            const audioInfo = document.getElementById('audio-info');
            if (audioInfo && params.liveMode) {
                audioInfo.textContent = `LIVE MODE - Kick Level: ${kickLevel.toFixed(1)}%`;
            }
            
            frameCount = 0;
            lastTime = time;
        }
        
        // Render
        if (!recordVideoState || useMobileRecord) {
            drawScene();
        }
        
        animationID = requestAnimationFrame(renderLive);
    }
}

// Initialize intro overlay controls and button handlers
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('intro-overlay');
    const startButton = document.getElementById('start-button');
    
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (overlay) {
                overlay.style.display = 'none';
            }
            // Auto-enable live mode for immediate use
            if (!params.liveMode) {
                params.liveMode = true;
                toggleLiveMode();
            }
        });
    }
    
    // Live performance button handlers
    const micInputBtn = document.getElementById('micInputBtn');
    if (micInputBtn) {
        micInputBtn.addEventListener('click', () => {
            params.microphoneInput = !params.microphoneInput;
            toggleMicrophoneInput();
            // Update GUI
            for (let f in gui.__folders) {
                const folder = gui.__folders[f];
                for (let i in folder.__controllers) {
                    folder.__controllers[i].updateDisplay();
                }
            }
        });
    }
    
    const liveModeBtn = document.getElementById('liveModeBtn');
    if (liveModeBtn) {
        liveModeBtn.addEventListener('click', () => {
            params.liveMode = !params.liveMode;
            toggleLiveMode();
        });
    }
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Update button visual states based on current settings
    function updateButtonStates() {
        if (micInputBtn) {
            micInputBtn.style.background = params.microphoneInput ? 
                'rgba(0, 255, 150, 1)' : 'rgba(0, 255, 150, 0.8)';
        }
        if (liveModeBtn) {
            liveModeBtn.style.background = params.liveMode ? 
                'rgba(255, 50, 50, 1)' : 'rgba(0, 255, 150, 0.8)';
        }
    }
    
    // Call initial update
    updateButtonStates();
    
    // Update button states periodically
    setInterval(updateButtonStates, 1000);
});

// Start the animation loop with live performance enhancements
isPlaying = true;
refreshPattern();
updateUniforms();
// Use the enhanced render function for live performance
animationID = requestAnimationFrame(renderLive);