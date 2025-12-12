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