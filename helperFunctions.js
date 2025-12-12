// Toggle play/pause
function togglePlayPause() {
  
  if (isPlaying) {
    cancelAnimationFrame(animationID);
    isPlaying = false;
  } else {
    isPlaying = true;
    animationID = requestAnimationFrame(render);
  }
}

// Function to refresh the pattern with a new random seed
function refreshPattern() {
  timeOffset = performance.now();
  randomSeed = Math.floor(Math.random() * 1000,0);
  gl.uniform1f(seedLocation, randomSeed);
  if(!isPlaying){
    isPlaying = true;
    animationID = requestAnimationFrame(render);
  }
}

// Handle keyboard events
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
      event.preventDefault();
      togglePlayPause();
  }

  if (event.code === 'Tab') {
    event.preventDefault();
    refreshPattern();
  }

  if (event.code === 'KeyR') {
    randomizeInputs();
  }

  if (event.code === 'KeyS') {
    saveImage();
  }

  if (event.code === 'KeyV') {
    toggleVideoRecord();
  }

  if (event.code === 'KeyT') {
    startFromZeroTime();
  }

  if (event.code === 'KeyM') {
    toggleMusic();
  }

  if (event.code === 'KeyZ') {
    toggleZenMode();
  }
});

function startFromZeroTime(){
  console.log("Restarting animation from time = 0");
  
  // Cancel current animation if running
  if (animationID) {
    cancelAnimationFrame(animationID);
  }
  
  // Set the time offset to the current time
  // This will be subtracted in the render function
  timeOffset = performance.now();
  
  // Reset frame counter for FPS calculation
  frameCount = 0;
  lastTime = performance.now();
  
  // Make sure all other uniforms are updated
  updateUniforms();
  
  // Ensure animation is playing
  isPlaying = true;
  
  // Start the animation loop from the beginning
  animationID = requestAnimationFrame(render);
}

// Function to randomize all GUI parameters
function randomizeInputs() {
  timeOffset = performance.now();
  console.log("randomize inputs");
  params.timeScale = 0.1 + Math.random() * 0.8;
  
  // Randomize pattern controls
  params.patternAmp = 3.0 + Math.random() * 17.0;
  params.patternFreq = 0.2 + Math.random() * 4.8;
  
  // Randomize visual effects
  params.bloomStrength = Math.random() * 3.0;
  params.saturation = Math.random() * 2.0;
  params.grainAmount = Math.random() * 0.5;
  params.minCircleSize = Math.random() * 5.0;
  params.circleStrength = Math.random() * 3.0;
  params.distortX = Math.random() * 50.0;
  params.distortY = Math.random() * 50.0;
  
  // Randomize color tint
  params.colorTintR = Math.random() * 1.5;
  params.colorTintG = Math.random() * 1.5;
  params.colorTintB = Math.random() * 1.5;
  
  // Update the GUI controllers to reflect the new values
  for (let i in gui.__controllers) {
    gui.__controllers[i].updateDisplay();
  }
  
  // Update the folder controllers if any
  for (let f in gui.__folders) {
    const folder = gui.__folders[f];
    for (let i in folder.__controllers) {
      folder.__controllers[i].updateDisplay();
    }
  }
  
  updateUniforms();
  refreshPattern();
}

// Add this function to handle canvas resizing
function updateCanvasSize() {
  // Update canvas dimensions
  canvas.width = params.canvasWidth;
  canvas.height = params.canvasHeight;
  
  // Update the WebGL viewport to match
  gl.viewport(0, 0, canvas.width, canvas.height);
  
  // Re-render if not already playing
  if (!isPlaying) {
      drawScene();
  }
  
  // If recording is active, we need to handle that
  if (recordVideoState) {
      stopRecording();
      startRecording();
  }
}

window.addEventListener('resize', function() {
  gl.viewport(0, 0, canvas.width, canvas.height);
});

document.getElementById('randomizeBtn').addEventListener('click', () => randomizeInputs());
document.getElementById('playPauseBtn').addEventListener('click', () => togglePlayPause());
document.getElementById('exportVideoBtn').addEventListener('click', () => toggleVideoRecord());
document.getElementById('saveBtn').addEventListener('click', () => saveImage());
document.getElementById('toggleMusicBtn').addEventListener('click', () => toggleMusic());
document.getElementById('zen-mode-button').addEventListener('click', () => toggleZenMode());
document.getElementById('upload-audio-btn').addEventListener('click', () => triggerAudioUpload());
document.getElementById('preset-mode-button').addEventListener('click', () => showPresetModal());

//intro overlay info screen

let musicPlaying = true;
const backgroundMusic = new Audio('assets/fahrenheitFairEnough.mp3');

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('intro-overlay');
  const startButton = document.getElementById('start-button');
  
  startButton.addEventListener('click', () => {

    // Play background music
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.7;        
    const playPromise = backgroundMusic.play();

    overlay.style.display = 'none';
  });
});


let isZenMode = false;

function hideInfo(){
  document.querySelector("#button-table").classList.add("hidden");
  document.querySelector("#info-container").classList.add("hidden");
  document.querySelector(".close-button").style.opacity = 0;
}

function showInfo(){
  document.querySelector("#button-table").classList.remove("hidden");
  document.querySelector("#info-container").classList.remove("hidden");
  document.querySelector(".close-button").style.opacity = 0.6;
}

function toggleZenMode(){
  if(isZenMode){
    showInfo();
  } else {
    hideInfo();
  }
  isZenMode = !isZenMode;
}

// Audio upload functionality
function triggerAudioUpload() {
  document.getElementById('audio-upload-input').click();
}

document.getElementById('audio-upload-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith('audio/')) {
    handleAudioUpload(file);
  }
});

function handleAudioUpload(file) {
  if (uploadedAudio) {
    uploadedAudio.pause();
    uploadedAudio.src = '';
  }
  
  const audioUrl = URL.createObjectURL(file);
  uploadedAudio = new Audio(audioUrl);
  uploadedAudio.crossOrigin = "anonymous";
  uploadedAudio.loop = true;
  uploadedAudio.volume = 0.7;
  
  uploadedAudio.addEventListener('loadeddata', () => {
    setupAudioContext(uploadedAudio);
    params.audioReactive = true;
    updateUniforms();
    
    // Update GUI to reflect audio reactive mode
    for (let f in gui.__folders) {
      const folder = gui.__folders[f];
      for (let i in folder.__controllers) {
        folder.__controllers[i].updateDisplay();
      }
    }
    
    document.getElementById('audio-info').textContent = `Audio loaded: ${file.name}`;
  });
  
  // Stop default background music when user uploads their own
  if (musicPlaying) {
    backgroundMusic.pause();
    musicPlaying = false;
  }
  
  uploadedAudio.play().catch(e => {
    console.log('Auto-play prevented, user will need to manually start audio');
  });
}

// Preset modal functionality
function showPresetModal() {
  document.getElementById('preset-modal').classList.remove('hidden');
  // Initialize preset thumbnails when modal is shown
  initializePresetThumbnails();
}

function hidePresetModal() {
  document.getElementById('preset-modal').classList.add('hidden');
}

document.getElementById('close-preset-modal').addEventListener('click', hidePresetModal);

// Add event listeners for preset buttons
document.addEventListener('DOMContentLoaded', function() {
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Check if the edit button was clicked
      if (e.target.classList.contains('preset-edit-btn')) {
        e.stopPropagation();
        const presetName = e.target.getAttribute('data-preset');
        showPresetEditor(presetName);
      } else {
        const presetName = this.getAttribute('data-preset');
        applyPreset(presetName);
        hidePresetModal();
      }
    });
  });
  
  // Setup preset editor functionality
  setupPresetEditor();
});

// Preset Editor Functions
let currentEditingPreset = null;
let originalPresetValues = {};

function showPresetEditor(presetName) {
  currentEditingPreset = presetName;
  
  // Hide the preset selector modal first
  hidePresetModal();
  
  // Store original values for reset functionality
  originalPresetValues = {...canvasPresets[presetName]};
  
  // Show the editor modal
  document.getElementById('preset-editor-modal').classList.remove('hidden');
  
  // Update title
  document.getElementById('preset-editor-title').textContent = `Edit ${formatPresetName(presetName)}`;
  
  // Load current values into the editor
  loadPresetIntoEditor(presetName);
}

function hidePresetEditor() {
  document.getElementById('preset-editor-modal').classList.add('hidden');
  currentEditingPreset = null;
}

function formatPresetName(presetName) {
  const names = {
    ambient: 'Ambient Flow',
    energetic: 'High Energy',
    minimal: 'Minimalist',
    abstract: 'Abstract Art',
    retro: 'Retro Wave',
    organic: 'Organic Shapes'
  };
  return names[presetName] || presetName;
}

function loadPresetIntoEditor(presetName) {
  const preset = canvasPresets[presetName];
  
  // Load all values into the editor controls
  Object.keys(preset).forEach(key => {
    const element = document.getElementById(`edit-${key}`);
    if (element) {
      element.value = preset[key];
      // Update the display value
      const valueSpan = element.parentElement.querySelector('.slider-value');
      if (valueSpan) {
        valueSpan.textContent = preset[key];
      }
    }
  });
  
  // Update color previews
  updateColorPreviews();
}

function updateColorPreviews() {
  // Color Tint previews
  const r = parseFloat(document.getElementById('edit-colorTintR').value);
  const g = parseFloat(document.getElementById('edit-colorTintG').value);
  const b = parseFloat(document.getElementById('edit-colorTintB').value);
  
  document.getElementById('red-preview').style.background = 
    `linear-gradient(135deg, #000, rgb(${Math.round(r * 255)}, 0, 0))`;
  document.getElementById('green-preview').style.background = 
    `linear-gradient(135deg, #000, rgb(0, ${Math.round(g * 255)}, 0))`;
  document.getElementById('blue-preview').style.background = 
    `linear-gradient(135deg, #000, rgb(0, 0, ${Math.round(b * 255)}))`;

  // Overlay Color previews
  const or = parseFloat(document.getElementById('edit-overlayColorR').value);
  const og = parseFloat(document.getElementById('edit-overlayColorG').value);
  const ob = parseFloat(document.getElementById('edit-overlayColorB').value);
  const oa = parseFloat(document.getElementById('edit-overlayOpacity').value);
  
  document.getElementById('overlay-red-preview').style.background = 
    `linear-gradient(135deg, rgba(0,0,0,0.8), rgba(${Math.round(or * 255)}, 0, 0, ${oa}))`;
  document.getElementById('overlay-green-preview').style.background = 
    `linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0, ${Math.round(og * 255)}, 0, ${oa}))`;
  document.getElementById('overlay-blue-preview').style.background = 
    `linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0, 0, ${Math.round(ob * 255)}, ${oa}))`;

  // Background Color previews
  const br = parseFloat(document.getElementById('edit-backgroundColorR').value);
  const bg = parseFloat(document.getElementById('edit-backgroundColorG').value);
  const bb = parseFloat(document.getElementById('edit-backgroundColorB').value);
  const ba = parseFloat(document.getElementById('edit-backgroundOpacity').value);
  
  document.getElementById('background-red-preview').style.background = 
    `linear-gradient(135deg, rgba(0,0,0,1), rgba(${Math.round(br * 255)}, 0, 0, ${ba}))`;
  document.getElementById('background-green-preview').style.background = 
    `linear-gradient(135deg, rgba(0,0,0,1), rgba(0, ${Math.round(bg * 255)}, 0, ${ba}))`;
  document.getElementById('background-blue-preview').style.background = 
    `linear-gradient(135deg, rgba(0,0,0,1), rgba(0, 0, ${Math.round(bb * 255)}, ${ba}))`;
}

function setupPresetEditor() {
  // Close button
  document.getElementById('close-preset-editor').addEventListener('click', hidePresetEditor);
  
  // Apply changes button
  document.getElementById('apply-preset-changes').addEventListener('click', applyPresetChanges);
  
  // Reset button
  document.getElementById('reset-preset').addEventListener('click', resetPreset);
  
  // Color picker functionality
  setupColorPickers();
  
  // Setup collapsible sections (Photoshop-style)
  const sectionHeaders = document.querySelectorAll('.editor-section h4');
  sectionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const section = this.parentElement;
      const controls = section.querySelector('.editor-controls');
      
      if (this.classList.contains('collapsed')) {
        controls.style.display = 'block';
        this.classList.remove('collapsed');
      } else {
        controls.style.display = 'none';
        this.classList.add('collapsed');
      }
    });
  });
  
  // Setup all sliders with real-time updates
  const sliders = document.querySelectorAll('#preset-editor-modal input[type="range"]');
  sliders.forEach(slider => {
    slider.addEventListener('input', function() {
      // Update the value display
      const valueSpan = this.parentElement.querySelector('.slider-value');
      if (valueSpan) {
        valueSpan.textContent = this.value;
      }
      
      // Update color previews if this is a color slider
      if (this.id.includes('colorTint') || this.id.includes('overlayColor') || this.id.includes('backgroundColor') || this.id.includes('Opacity')) {
        updateColorPreviews();
      }
      
      // Apply changes in real-time for preview
      if (currentEditingPreset) {
        applyCurrentEditorValues();
      }
    });
  });
}

function applyCurrentEditorValues() {
  if (!currentEditingPreset) return;
  
  const preset = canvasPresets[currentEditingPreset];
  const updatedPreset = {};
  
  // Collect all values from editor
  Object.keys(preset).forEach(key => {
    const element = document.getElementById(`edit-${key}`);
    if (element) {
      updatedPreset[key] = parseFloat(element.value);
    }
  });
  
  // Apply to current parameters for real-time preview
  Object.keys(updatedPreset).forEach(key => {
    if (params.hasOwnProperty(key)) {
      params[key] = updatedPreset[key];
    }
  });
  
  // Update GUI controllers
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
}

function applyPresetChanges() {
  if (!currentEditingPreset) return;
  
  // Update the preset definition with new values
  const preset = canvasPresets[currentEditingPreset];
  Object.keys(preset).forEach(key => {
    const element = document.getElementById(`edit-${key}`);
    if (element) {
      canvasPresets[currentEditingPreset][key] = parseFloat(element.value);
    }
  });
  
  // Apply to current parameters
  applyPreset(currentEditingPreset);
  
  // Hide the editor
  hidePresetEditor();
  
  console.log(`Applied changes to ${formatPresetName(currentEditingPreset)} preset`);
}

function resetPreset() {
  if (!currentEditingPreset || !originalPresetValues) return;
  
  // Restore original values
  canvasPresets[currentEditingPreset] = {...originalPresetValues};
  
  // Reload into editor
  loadPresetIntoEditor(currentEditingPreset);
  
  // Apply for immediate preview
  applyCurrentEditorValues();
  
  console.log(`Reset ${formatPresetName(currentEditingPreset)} to default values`);
}

// Override toggleMusic to handle uploaded audio
function toggleMusic(){
  if (uploadedAudio) {
    if (musicPlaying) {
      uploadedAudio.pause();
      musicPlaying = false;
    } else {
      uploadedAudio.play();
      musicPlaying = true;
    }
  } else {
    if(musicPlaying){
      backgroundMusic.pause();
      musicPlaying = false;
    } else {
      const playPromise = backgroundMusic.play();
      musicPlaying = true;
    }
  }
}

function setupColorPickers() {
  // Color Tint Picker
  const colorTintPicker = document.getElementById('colorTintPicker');
  const colorTintHex = document.getElementById('colorTint-hex');
  const advancedBtn = document.getElementById('colorTint-advanced');
  const advancedControls = document.getElementById('colorTint-advanced-controls');
  
  // Color picker change handler
  colorTintPicker.addEventListener('input', function() {
    const hexColor = this.value;
    const rgb = hexToRgb(hexColor);
    
    // Update hex display
    colorTintHex.textContent = hexColor.toLowerCase();
    
    // Convert to 0-1.5 range for shader compatibility
    const r = (rgb.r / 255) * 1.5;
    const g = (rgb.g / 255) * 1.5;
    const b = (rgb.b / 255) * 1.5;
    
    // Update RGB sliders
    const redSlider = document.getElementById('edit-colorTintR');
    const greenSlider = document.getElementById('edit-colorTintG');
    const blueSlider = document.getElementById('edit-colorTintB');
    
    if (redSlider) {
      redSlider.value = r.toFixed(1);
      redSlider.nextElementSibling.nextElementSibling.textContent = r.toFixed(1);
    }
    if (greenSlider) {
      greenSlider.value = g.toFixed(1);
      greenSlider.nextElementSibling.nextElementSibling.textContent = g.toFixed(1);
    }
    if (blueSlider) {
      blueSlider.value = b.toFixed(1);
      blueSlider.nextElementSibling.nextElementSibling.textContent = b.toFixed(1);
    }
    
    // Update shader uniforms if they exist
    updateShaderColorFromRGB(r, g, b);
  });
  
  // Advanced controls toggle
  advancedBtn.addEventListener('click', function() {
    if (advancedControls.style.display === 'none' || !advancedControls.style.display) {
      advancedControls.style.display = 'block';
      this.textContent = 'Hide Advanced';
    } else {
      advancedControls.style.display = 'none';
      this.textContent = 'Fine Tune';
    }
  });
  
  // Update color picker when RGB sliders change
  const rgbSliders = ['edit-colorTintR', 'edit-colorTintG', 'edit-colorTintB'];
  rgbSliders.forEach(sliderId => {
    const slider = document.getElementById(sliderId);
    if (slider) {
      slider.addEventListener('input', function() {
        updateColorPickerFromRGB();
      });
    }
  });
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  // Convert from 0-1.5 range back to 0-255
  const red = Math.round((r / 1.5) * 255);
  const green = Math.round((g / 1.5) * 255);
  const blue = Math.round((b / 1.5) * 255);
  
  return "#" + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);
}

function updateColorPickerFromRGB() {
  const redSlider = document.getElementById('edit-colorTintR');
  const greenSlider = document.getElementById('edit-colorTintG');
  const blueSlider = document.getElementById('edit-colorTintB');
  const colorPicker = document.getElementById('colorTintPicker');
  const hexDisplay = document.getElementById('colorTint-hex');
  
  if (redSlider && greenSlider && blueSlider && colorPicker) {
    const r = parseFloat(redSlider.value);
    const g = parseFloat(greenSlider.value);
    const b = parseFloat(blueSlider.value);
    
    const hexColor = rgbToHex(r, g, b);
    colorPicker.value = hexColor;
    hexDisplay.textContent = hexColor.toLowerCase();
  }
}

function updateShaderColorFromRGB(r, g, b) {
  // Update the current preset values if we're in editing mode
  if (typeof currentPresetValues !== 'undefined' && currentPresetValues) {
    currentPresetValues.colorTintR = r;
    currentPresetValues.colorTintG = g;
    currentPresetValues.colorTintB = b;
  }
  
  // Update shader uniforms if the shader program exists
  if (typeof gl !== 'undefined' && gl && typeof shaderProgram !== 'undefined' && shaderProgram) {
    const colorTintRLocation = gl.getUniformLocation(shaderProgram, 'colorTintR');
    const colorTintGLocation = gl.getUniformLocation(shaderProgram, 'colorTintG');
    const colorTintBLocation = gl.getUniformLocation(shaderProgram, 'colorTintB');
    
    if (colorTintRLocation) gl.uniform1f(colorTintRLocation, r);
    if (colorTintGLocation) gl.uniform1f(colorTintGLocation, g);
    if (colorTintBLocation) gl.uniform1f(colorTintBLocation, b);
  }
}

function initializePresetThumbnails() {
  const presetPreviews = document.querySelectorAll('.preset-preview');
  
  presetPreviews.forEach(canvas => {
    const presetName = canvas.getAttribute('data-preset');
    renderPresetThumbnail(canvas, presetName);
  });
}

function renderPresetThumbnail(canvas, presetName) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Get preset colors and style
  const presetStyles = {
    ambient: { 
      colors: ['#4a9eff', '#7b68ee', '#ff6b9d'], 
      pattern: 'waves',
      description: 'Smooth flowing gradients'
    },
    energetic: { 
      colors: ['#ff3030', '#ff6b35', '#f7931e'], 
      pattern: 'pulses',
      description: 'Dynamic pulsing shapes'
    },
    minimal: { 
      colors: ['#ffffff', '#e0e0e0', '#b0b0b0'], 
      pattern: 'lines',
      description: 'Clean geometric forms'
    },
    abstract: { 
      colors: ['#9c27b0', '#e91e63', '#ff5722'], 
      pattern: 'organic',
      description: 'Complex organic patterns'
    },
    retro: { 
      colors: ['#ff0080', '#00ffff', '#ffff00'], 
      pattern: 'grid',
      description: '80s neon aesthetics'
    },
    organic: { 
      colors: ['#4caf50', '#8bc34a', '#cddc39'], 
      pattern: 'bubbles',
      description: 'Natural flowing forms'
    }
  };
  
  const style = presetStyles[presetName] || presetStyles.ambient;
  
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  
  // Create animated preview based on pattern type
  let animationId;
  let startTime = Date.now();
  
  function animate() {
    const elapsed = (Date.now() - startTime) / 1000; // Time in seconds
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, style.colors[0] + '40');
    gradient.addColorStop(0.5, style.colors[1] + '60');
    gradient.addColorStop(1, style.colors[2] + '40');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add pattern overlay based on style
    ctx.globalCompositeOperation = 'screen';
    
    switch (style.pattern) {
      case 'waves':
        drawWaves(ctx, width, height, elapsed, style.colors);
        break;
      case 'pulses':
        drawPulses(ctx, width, height, elapsed, style.colors);
        break;
      case 'lines':
        drawLines(ctx, width, height, elapsed, style.colors);
        break;
      case 'organic':
        drawOrganic(ctx, width, height, elapsed, style.colors);
        break;
      case 'grid':
        drawGrid(ctx, width, height, elapsed, style.colors);
        break;
      case 'bubbles':
        drawBubbles(ctx, width, height, elapsed, style.colors);
        break;
    }
    
    ctx.globalCompositeOperation = 'source-over';
    
    // Continue animation for 3 seconds, then loop
    if (elapsed < 3) {
      animationId = requestAnimationFrame(animate);
    } else {
      startTime = Date.now();
      animationId = requestAnimationFrame(animate);
    }
  }
  
  animate();
  
  // Stop animation when modal is closed
  const observer = new MutationObserver(() => {
    const modal = document.getElementById('preset-modal');
    if (modal.classList.contains('hidden')) {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }
  });
  
  observer.observe(document.getElementById('preset-modal'), {
    attributes: true,
    attributeFilter: ['class']
  });
}

// Thumbnail pattern drawing functions
function drawWaves(ctx, width, height, time, colors) {
  ctx.strokeStyle = colors[0] + '80';
  ctx.lineWidth = 2;
  
  for (let y = 0; y < height; y += 20) {
    ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      const wave = Math.sin((x * 0.02) + (time * 2) + (y * 0.01)) * 10;
      if (x === 0) {
        ctx.moveTo(x, y + wave);
      } else {
        ctx.lineTo(x, y + wave);
      }
    }
    ctx.stroke();
  }
}

function drawPulses(ctx, width, height, time, colors) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < 3; i++) {
    const radius = (Math.sin(time * 3 + i) * 0.5 + 0.5) * 40 + 20;
    ctx.strokeStyle = colors[i % colors.length] + '60';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLines(ctx, width, height, time, colors) {
  ctx.strokeStyle = colors[0] + '40';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 8; i++) {
    const x = (i / 8) * width + Math.sin(time + i) * 5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawOrganic(ctx, width, height, time, colors) {
  for (let i = 0; i < 4; i++) {
    const x = (Math.sin(time + i) * 0.3 + 0.5) * width;
    const y = (Math.cos(time * 1.5 + i) * 0.3 + 0.5) * height;
    const radius = Math.sin(time * 2 + i) * 15 + 25;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colors[i % colors.length] + '80');
    gradient.addColorStop(1, colors[i % colors.length] + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrid(ctx, width, height, time, colors) {
  const spacing = 15;
  ctx.strokeStyle = colors[0] + '60';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x < width; x += spacing) {
    const offset = Math.sin(time + x * 0.1) * 3;
    ctx.beginPath();
    ctx.moveTo(x + offset, 0);
    ctx.lineTo(x + offset, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y < height; y += spacing) {
    const offset = Math.cos(time + y * 0.1) * 3;
    ctx.beginPath();
    ctx.moveTo(0, y + offset);
    ctx.lineTo(width, y + offset);
    ctx.stroke();
  }
}

function drawBubbles(ctx, width, height, time, colors) {
  for (let i = 0; i < 6; i++) {
    const x = ((i * 137.5) % width); // Golden ratio distribution
    const y = ((Math.sin(time * 0.5 + i) * 0.8 + 1) / 2) * height;
    const radius = Math.sin(time + i * 0.7) * 8 + 12;
    
    ctx.fillStyle = colors[i % colors.length] + '60';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}