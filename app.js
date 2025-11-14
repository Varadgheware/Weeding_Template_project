const DEFAULT_PROJECT = {
  meta: { name: "A_weds_B" },
  slides: [
    {
      id: "s1",
      image: "./assets/slide1.jpg",
      layers: [
        {
          id: "t1",
          type: "text",
          text: "A weds B",
          fontFamily: "'Charm', cursive",
          fontWeight: 400,
          fontSize: 28,
          color: "#2b2b2b",
          align: "center",
          lineHeight: 1.2,
          x: 0.5,
          y: 0.18,
          zIndex: 10,
          language: "en",
          startAnimation: "none",
          endAnimation: "none",
        },
      ],
    },
    {
      id: "s2",
      image: "./assets/slide2.jpg",
      layers: [
        {
          id: "t2",
          type: "text",
          text: "We invite you and your family's gracious presence and blessing",
          fontFamily: "'Charm', cursive",
          fontWeight: 400,
          fontSize: 20,
          color: "#2b2b2b",
          align: "center",
          lineHeight: 1.3,
          x: 0.5,
          y: 0.3,
          zIndex: 10,
          language: "en",
          startAnimation: "none",
          endAnimation: "none",
        },
      ],
    },
    {
      id: "s3",
      image: "./assets/slide3.jpg",
      layers: [
        {
          id: "t3",
          type: "text",
          text: "Save the date",
          fontFamily: "'Charm', cursive",
          fontWeight: 400,
          fontSize: 24,
          color: "#2b2b2b",
          align: "center",
          lineHeight: 1.2,
          x: 0.5,
          y: 0.25,
          zIndex: 10,
          language: "en",
          startAnimation: "none",
          endAnimation: "none",
        },
      ],
    },
  ],
};

// State management
let project = loadOrDefault();
let selected = { slideId: null, layerId: null };
let swiper;
let dragData = null;
let rafId = null;
let isEditing = false;

// ==================== STORAGE ====================

function loadOrDefault() {
  try {
    const saved = localStorage.getItem("wedding-project");
    if (saved) {
      const parsed = JSON.parse(saved);
      validateProjectSchema(parsed);
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load project:", err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_PROJECT));
}

function validateProjectSchema(project) {
  if (!project.slides || !Array.isArray(project.slides)) {
    throw new Error("Invalid project schema: missing slides array");
  }
  project.slides.forEach((slide) => {
    if (!slide.id || !slide.layers || !Array.isArray(slide.layers)) {
      throw new Error("Invalid slide schema");
    }
    slide.layers.forEach((layer) => {
      if (layer.zIndex === undefined) layer.zIndex = 10;
      if (layer.fontWeight === undefined) layer.fontWeight = 400;
      if (layer.language === undefined) layer.language = "en";
      if (layer.startAnimation === undefined) layer.startAnimation = "none";
      if (layer.endAnimation === undefined) layer.endAnimation = "none";
    });
  });
}

function saveState() {
  localStorage.setItem("wedding-project", JSON.stringify(project));
  showAlert("Saved to browser storage!", "success");
}

function saveStateSilent() {
  localStorage.setItem("wedding-project", JSON.stringify(project));
}

// ==================== RENDERING ====================

function createSlides() {
  const wrapper = document.getElementById("swiper-wrapper");
  wrapper.innerHTML = "";

  project.slides.forEach((slide) => {
    const div = document.createElement("div");
    div.className = "swiper-slide";
    div.dataset.slideId = slide.id;

    const img = document.createElement("img");
    img.className = "slide-bg";
    img.src = slide.image;
    img.onerror = function() {
      // Fallback to gradient if image fails to load
      this.style.display = "none";
      div.style.background = "linear-gradient(180deg, #f5dcc8 0%, #d4a574 100%)";
    };
    div.appendChild(img);

    // Sort layers by zIndex
    const sortedLayers = [...slide.layers].sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10));
    sortedLayers.forEach((layer) => {
      div.appendChild(renderLayer(slide.id, layer));
    });

    wrapper.appendChild(div);
  });
}

function renderLayer(slideId, layer) {
  const el = document.createElement("div");
  el.className = "layer";
  el.dataset.layerId = layer.id;
  el.dataset.slideId = slideId;
  el.style.zIndex = layer.zIndex || 10;

  const text = document.createElement("div");
  text.className = "text";
  text.innerText = layer.text;
  text.contentEditable = false;

  applyTextStyles(text, layer);

  el.style.left = layer.x * 100 + "%";
  el.style.top = layer.y * 100 + "%";
  el.style.transform = "translate(-50%, -50%)";

  // Add layer controls (delete/duplicate icons)
  const controls = document.createElement("div");
  controls.className = "layer-controls";
  
  const duplicateBtn = document.createElement("button");
  duplicateBtn.className = "layer-control-btn";
  duplicateBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z"/></svg>`;
  duplicateBtn.title = "Duplicate";
  duplicateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    duplicateLayer(slideId, layer.id);
  });
  
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "layer-control-btn delete";
  deleteBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;
  deleteBtn.title = "Delete";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteLayer(slideId, layer.id);
  });
  
  controls.appendChild(duplicateBtn);
  controls.appendChild(deleteBtn);
  el.appendChild(controls);
  el.appendChild(text);

  // Events
  el.addEventListener("pointerdown", layerPointerDown);
  text.addEventListener("dblclick", () => {
    if (!isEditing) enterEditMode(slideId, layer.id);
  });
  text.addEventListener("input", (e) =>
    updateLayerText(slideId, layer.id, e.target.innerText)
  );
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    selectLayer(slideId, layer.id);
  });

  return el;
}

function applyTextStyles(dom, layer) {
  dom.style.fontFamily = layer.fontFamily;
  dom.style.fontSize = layer.fontSize + "px";
  dom.style.fontWeight = layer.fontWeight || 400;
  dom.style.color = layer.color;
  dom.style.textAlign = layer.align;
  dom.style.lineHeight = layer.lineHeight;
}

// ==================== DRAGGING WITH RAF ====================

function layerPointerDown(e) {
  if (isEditing) return;
  if (e.target.closest(".layer-controls")) return;

  const layerEl = e.currentTarget;
  const slideEl = layerEl.closest(".swiper-slide");
  const slideRect = slideEl.getBoundingClientRect();

  selectLayer(slideEl.dataset.slideId, layerEl.dataset.layerId);

  dragData = {
    layerEl,
    slideRect,
    startX: e.clientX,
    startY: e.clientY,
    currentX: e.clientX,
    currentY: e.clientY,
  };

  window.addEventListener("pointermove", layerPointerMove);
  window.addEventListener("pointerup", layerPointerUp, { once: true });
}

function layerPointerMove(e) {
  if (!dragData) return;

  dragData.currentX = e.clientX;
  dragData.currentY = e.clientY;

  if (!rafId) {
    rafId = requestAnimationFrame(updateDragPosition);
  }
}

function updateDragPosition() {
  if (!dragData) return;

  const { layerEl, slideRect, startX, startY, currentX, currentY } = dragData;

  const dx = currentX - startX;
  const dy = currentY - startY;

  const percentX = parseFloat(layerEl.style.left);
  const percentY = parseFloat(layerEl.style.top);

  const newX = percentX + (dx / slideRect.width) * 100;
  const newY = percentY + (dy / slideRect.height) * 100;

  layerEl.style.left = newX + "%";
  layerEl.style.top = newY + "%";

  dragData.startX = currentX;
  dragData.startY = currentY;

  rafId = null;
}

function layerPointerUp(e) {
  if (!dragData) return;

  const { layerEl, slideRect } = dragData;
  const slideId = layerEl.dataset.slideId;
  const layerId = layerEl.dataset.layerId;

  const rect = layerEl.getBoundingClientRect();
  const nx = (rect.left + rect.width / 2 - slideRect.left) / slideRect.width;
  const ny = (rect.top + rect.height / 2 - slideRect.top) / slideRect.height;

  updateLayerPosition(slideId, layerId, nx, ny);

  dragData = null;
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener("pointermove", layerPointerMove);
}

function updateLayerPosition(slideId, layerId, nx, ny) {
  const slide = project.slides.find((s) => s.id === slideId);
  const layer = slide.layers.find((l) => l.id === layerId);

  layer.x = clamp(nx, 0, 1);
  layer.y = clamp(ny, 0, 1);

  saveStateSilent();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ==================== TEXT EDITING ====================

function enterEditMode(slideId, layerId) {
  isEditing = true;
  const slideEl = document.querySelector(
    `.swiper-slide[data-slide-id="${slideId}"]`
  );
  const layerEl = slideEl.querySelector(`.layer[data-layer-id="${layerId}"]`);
  const text = layerEl.querySelector(".text");

  text.contentEditable = true;
  text.focus();

  const range = document.createRange();
  range.selectNodeContents(text);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  text.addEventListener(
    "blur",
    () => {
      text.contentEditable = false;
      isEditing = false;
      updateLayerText(slideId, layerId, text.innerText);
    },
    { once: true }
  );
}

function updateLayerText(slideId, layerId, newText) {
  const slide = project.slides.find((s) => s.id === slideId);
  const layer = slide.layers.find((l) => l.id === layerId);

  layer.text = newText;
  saveStateSilent();
  populatePanel();
}

// ==================== SELECTION & PANEL ====================

function selectLayer(slideId, layerId) {
  document
    .querySelectorAll(".layer.selected")
    .forEach((e) => e.classList.remove("selected"));

  const layerEl = document.querySelector(
    `.layer[data-slide-id="${slideId}"][data-layer-id="${layerId}"]`
  );

  if (!layerEl) return;

  layerEl.classList.add("selected");
  selected = { slideId, layerId };

  // Show panel content
  document.getElementById("panelContent").style.display = "block";
  document.getElementById("panelTitle").textContent = "Blessing " + (project.slides.findIndex(s => s.id === slideId) + 1);
  document.getElementById("backBtn").style.display = "none";

  populatePanel();
}

function deselectLayer() {
  document
    .querySelectorAll(".layer.selected")
    .forEach((e) => e.classList.remove("selected"));
  
  selected = { slideId: null, layerId: null };
  document.getElementById("panelContent").style.display = "none";
  document.getElementById("panelTitle").textContent = "Select Text to Edit";
}

function populatePanel() {
  const layer = getSelectedLayer();
  if (!layer) {
    deselectLayer();
    return;
  }

  document.getElementById("language").value = layer.language || "en";
  document.getElementById("textInput").value = layer.text;
  document.getElementById("fontFamily").value = layer.fontFamily;
  document.getElementById("fontWeight").value = layer.fontWeight || 400;
  document.getElementById("fontSize").value = layer.fontSize;
  document.getElementById("fontColor").value = layer.color;
  document.getElementById("lineHeight").value = layer.lineHeight;
  document.getElementById("startAnimation").value = layer.startAnimation || "none";
  document.getElementById("endAnimation").value = layer.endAnimation || "none";

  // Update color preview
  document.getElementById("colorPreview").style.background = layer.color;

  // Update alignment buttons
  updateAlignmentButtons(layer.align);
}

function getSelectedLayer() {
  if (!selected.slideId) return null;
  const slide = project.slides.find((s) => s.id === selected.slideId);
  return slide?.layers.find((l) => l.id === selected.layerId);
}

function applyToSelected() {
  const layer = getSelectedLayer();
  if (!layer) return;

  const layerEl = document.querySelector(
    `.layer[data-layer-id="${layer.id}"][data-slide-id="${selected.slideId}"]`
  );

  if (!layerEl) return;

  const text = layerEl.querySelector(".text");
  if (text) {
    applyTextStyles(text, layer);
  }

  layerEl.style.zIndex = layer.zIndex || 10;
}

function updateAlignmentButtons(align) {
  document.querySelectorAll(".align-btn").forEach((btn) => {
    if (btn.dataset.align === align) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// ==================== LAYER OPERATIONS ====================

function deleteLayer(slideId, layerId) {
  const slide = project.slides.find((s) => s.id === slideId);
  slide.layers = slide.layers.filter((l) => l.id !== layerId);

  deselectLayer();

  createSlides();
  swiper.update();
  saveStateSilent();
}

function duplicateLayer(slideId, layerId) {
  const layer = getSelectedLayer();
  if (!layer) return;

  const slide = project.slides.find((s) => s.id === slideId);
  const copy = JSON.parse(JSON.stringify(layer));

  copy.id = layer.id + "_copy_" + Date.now();
  copy.x = clamp(copy.x + 0.03, 0, 1);
  copy.y = clamp(copy.y + 0.03, 0, 1);
  copy.zIndex = (Math.max(...slide.layers.map((l) => l.zIndex || 10))) + 1;

  slide.layers.push(copy);

  createSlides();
  swiper.update();
  selectLayer(slideId, copy.id);
  saveStateSilent();
}

// ==================== PANEL INPUT HANDLERS ====================

document.getElementById("textInput").addEventListener("input", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.text = e.target.value;
  const layerEl = document.querySelector(
    `.layer[data-layer-id="${layer.id}"][data-slide-id="${selected.slideId}"]`
  );
  if (layerEl) {
    const text = layerEl.querySelector(".text");
    if (text) text.innerText = layer.text;
  }
  saveStateSilent();
});

document.getElementById("language").addEventListener("change", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.language = e.target.value;
  saveStateSilent();
});

document.getElementById("fontFamily").addEventListener("change", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.fontFamily = e.target.value;
  applyToSelected();
  saveStateSilent();
});

document.getElementById("fontWeight").addEventListener("change", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.fontWeight = Number(e.target.value);
  applyToSelected();
  saveStateSilent();
});

document.getElementById("fontSize").addEventListener("input", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  const value = Number(e.target.value);
  if (value < 8) {
    e.target.value = 8;
    layer.fontSize = 8;
  } else if (value > 200) {
    e.target.value = 200;
    layer.fontSize = 200;
  } else {
    layer.fontSize = value;
  }
  applyToSelected();
  saveStateSilent();
});

document.getElementById("increaseFontSize").addEventListener("click", () => {
  const layer = getSelectedLayer();
  if (!layer) return;

  const fontSizeInput = document.getElementById("fontSize");
  const currentSize = Number(fontSizeInput.value);
  if (currentSize < 200) {
    fontSizeInput.value = currentSize + 1;
    layer.fontSize = currentSize + 1;
    applyToSelected();
    saveStateSilent();
  }
});

document.getElementById("decreaseFontSize").addEventListener("click", () => {
  const layer = getSelectedLayer();
  if (!layer) return;

  const fontSizeInput = document.getElementById("fontSize");
  const currentSize = Number(fontSizeInput.value);
  if (currentSize > 8) {
    fontSizeInput.value = currentSize - 1;
    layer.fontSize = currentSize - 1;
    applyToSelected();
    saveStateSilent();
  }
});

document.getElementById("fontColor").addEventListener("input", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.color = e.target.value;
  document.getElementById("colorPreview").style.background = layer.color;
  applyToSelected();
  saveStateSilent();
});

document.getElementById("lineHeight").addEventListener("input", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.lineHeight = Number(e.target.value);
  applyToSelected();
  saveStateSilent();
});

document.querySelectorAll(".align-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const align = btn.dataset.align;
    const layer = getSelectedLayer();
    if (!layer) return;

    layer.align = align;
    updateAlignmentButtons(align);
    applyToSelected();
    saveStateSilent();
  });
});

document.getElementById("startAnimation").addEventListener("change", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.startAnimation = e.target.value;
  saveStateSilent();
});

document.getElementById("endAnimation").addEventListener("change", (e) => {
  const layer = getSelectedLayer();
  if (!layer) return;

  layer.endAnimation = e.target.value;
  saveStateSilent();
});

document.getElementById("deleteLayer").addEventListener("click", () => {
  if (!selected.layerId) return;
  deleteLayer(selected.slideId, selected.layerId);
});

document.getElementById("duplicateLayer").addEventListener("click", () => {
  if (!selected.layerId) return;
  duplicateLayer(selected.slideId, selected.layerId);
});

// ==================== TOOLBAR ACTIONS ====================

document.getElementById("addText").addEventListener("click", () => {
  const slideIndex = swiper.activeIndex;
  const slide = project.slides[slideIndex];

  const maxZ = Math.max(...slide.layers.map((l) => l.zIndex || 10));

  const newLayer = {
    id: "t" + Date.now(),
    type: "text",
    text: "New Text",
    fontFamily: "'Charm', cursive",
    fontWeight: 400,
    fontSize: 22,
    color: "#2b2b2b",
    align: "center",
    lineHeight: 1.2,
    x: 0.5,
    y: 0.5,
    zIndex: maxZ + 1,
    language: "en",
    startAnimation: "none",
    endAnimation: "none",
  };

  slide.layers.push(newLayer);

  createSlides();
  swiper.update();
  selectLayer(slide.id, newLayer.id);
  saveStateSilent();
});

document.getElementById("saveState").addEventListener("click", saveState);

document.getElementById("exportJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = (project.meta?.name || "project") + ".json";
  a.click();

  URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importJson").click();
});

document.getElementById("importJson").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      validateProjectSchema(imported);
      project = imported;
      saveStateSilent();
      createSlides();
      swiper.update();
      deselectLayer();
      showAlert("Imported successfully!", "success");
    } catch (err) {
      showAlert("Invalid JSON or schema error: " + err.message, "error");
    }
  };

  reader.readAsText(file);
});

// ==================== UTILITY ====================

function showAlert(message, type = "info") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

// ==================== INITIALIZATION ====================

function init() {
  createSlides();

  swiper = new Swiper(".mySwiper", {
    pagination: { 
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    spaceBetween: 10,
    slidesPerView: 1,
  });

  // Deselect when clicking on body (but not on panel or layers)
  document.body.addEventListener("click", (e) => {
    if (!e.target.closest(".layer") && !e.target.closest("#panel")) {
      deselectLayer();
    }
  });

  // Prevent panel clicks from deselecting
  document.getElementById("panel").addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

init();
