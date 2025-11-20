import "./style.css";
import { ShaderType, CameraTypes } from "./common.js";
import { Graphics, GraphicsConstructorParams } from "./graphics.js";
import { Editor, EditorConstructorParams } from "./editor.js";
import { Project } from "./project.js";
import { marked } from "marked";
import TurndownService from "turndown";
import * as TPG from "turndown-plugin-gfm";

class App {
  async init() {
    this._turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      hr: "---",
    });

    this._turndownService.use(TPG.gfm);

    marked.setOptions({ async: false, gfm: true });

    this._project = new Project();

    await this._project.loadDefault();

    const projectData = this._project.get();
    const vertexCode = projectData.Shaders.Vertex;
    const fragmentCode = projectData.Shaders.Fragment;
    const inputGeometryType = projectData.Shaders.InputGeometry.type;
    const inputGeometryValues = projectData.Shaders.InputGeometry.values;
    const wireframe = projectData.Shaders.Wireframe;
    const backgroundColor = projectData.Shaders.BackgroundColor;
    const cameraPosition = projectData.Shaders.Camera.position;
    const cameraType = projectData.Shaders.Camera.type;
    const cameraValues = projectData.Shaders.Camera.values;

    const graphicsParams = new GraphicsConstructorParams();
    graphicsParams.vertexCode = vertexCode;
    graphicsParams.fragmentCode = fragmentCode;
    graphicsParams.inputGeometryType = inputGeometryType;
    graphicsParams.inputGeometryValues = inputGeometryValues;
    graphicsParams.wireframe = wireframe;
    graphicsParams.backgroundColor = backgroundColor;
    graphicsParams.cameraPosition = cameraPosition;
    graphicsParams.cameraType = cameraType;
    graphicsParams.onShaderCompileCallback = this._onShaderCompile.bind(this);

    switch (cameraType) {
      case CameraTypes.Perspective:
        {
          graphicsParams.perspectiveCamera.fov = cameraValues.fov;
          graphicsParams.perspectiveCamera.near = cameraValues.near;
          graphicsParams.perspectiveCamera.far = cameraValues.far;
        }
        break;

      case CameraTypes.Orthographic:
        {
          graphicsParams.orthographicCamera.left = cameraValues.left;
          graphicsParams.orthographicCamera.right = cameraValues.right;
          graphicsParams.orthographicCamera.top = cameraValues.top;
          graphicsParams.orthographicCamera.bottom = cameraValues.bottom;
          graphicsParams.orthographicCamera.near = cameraValues.near;
          graphicsParams.orthographicCamera.far = cameraValues.far;
        }
        break;
    }

    this._graphics = new Graphics(graphicsParams);

    const editorParams = new EditorConstructorParams();
    editorParams.initialVertex = vertexCode;
    editorParams.initialFragment = fragmentCode;

    this._editor = new Editor(editorParams);

    this._setProject(projectData);

    const editProjectButton = document.getElementById("edit-button");
    const saveProjectButton = document.getElementById("save-button");
    const loadProjectButton = document.getElementById("load-button");
    const updateButton = document.getElementById("update-shader-btn");

    editProjectButton.onclick = this._onProjectEdit.bind(this);
    saveProjectButton.onclick = this._onProjectSave.bind(this);
    loadProjectButton.onclick = this._onProjectLoad.bind(this);
    updateButton.onclick = this._onUpdate.bind(this);

    document.addEventListener("keydown", this._onKeyDown.bind(this));
  }

  _onShaderCompile(type, logs) {
    this._editor.onUpdate(type, logs);
  }

  _onKeyDown(e) {
    const enterPressed = e.code === "NumpadEnter" || e.code === "Enter";
    const altPressed = e.altKey || e.code === "AltLeft";
    const ctrlPressed =
      e.ctrlKey || e.code === "ControlLeft" || e.code === "ControlRight";

    // Recompile code shortcut
    if (altPressed && enterPressed) {
      e.preventDefault();
      this._onUpdate();
    }

    // Save project shortcut
    else if (ctrlPressed && e.code === "KeyS") {
      e.preventDefault();

      if (!this._editMode) {
        this._onProjectSave();
      }
    }

    // Load project shortcut
    else if (ctrlPressed && e.code === "KeyO") {
      e.preventDefault();

      if (!this._editMode) {
        this._onProjectLoad();
      }
    }

    // Edit project shortcut
    else if (ctrlPressed && e.code === "KeyE") {
      e.preventDefault();
      this._onProjectEdit();
    }
  }

  _onUpdate() {
    const vertexCode = this._editor.getCurrentShaderCode(ShaderType.Vertex);
    const fragmentCode = this._editor.getCurrentShaderCode(ShaderType.Fragment);

    this._graphics.onShaderCodeUpdate(vertexCode, fragmentCode);
  }

  // normalize the HTML before converting to markdown (replace blob: with image:<id>)
  _preprocessHtmlBeforeSave(html) {
    const div = document.createElement("div");
    div.innerHTML = html;

    const imgs = div.querySelectorAll("img[src]");
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("blob:")) {
        const id = this._project.getIdByObjectUrl(src);
        if (id) img.setAttribute("src", `image:${id}`);
      }
    });

    return div.innerHTML;
  }

  // Create a json, retrieve section information and code from the editor
  _onProjectSave() {
    const projectData = this._project.get();

    const projectName = document.getElementById("project-name");
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");
    const geometryType = this._graphics.getActiveInputGeometryType();
    const geometryValues = this._graphics.getInputGeometryValues(geometryType);
    const wireframe = this._graphics.getWireframe();
    const backgroundColor = this._graphics.getBackgroundColor();
    const cameraPosition = this._graphics.getCameraPosition();
    const cameraType = this._graphics.getActiveCameraType();
    const cameraValues =
      cameraType === CameraTypes.Perspective
        ? this._graphics.getPerspectiveCameraValues()
        : this._graphics.getOrthographicCameraValues();

    // normalize images in the HTML before conversion
    const nameHtml = this._preprocessHtmlBeforeSave(projectName.innerHTML);
    const titleHtml = this._preprocessHtmlBeforeSave(tabTitle.innerHTML);
    const contentHtml = this._preprocessHtmlBeforeSave(tabContent.innerHTML);

    // convert to markdown
    const nameMd = this._convertToMarkdown(nameHtml);
    const titleMd = this._convertToMarkdown(titleHtml);
    const contentMd = this._convertToMarkdown(contentHtml);

    projectData.ProjectName = nameMd;
    projectData.Shaders = {};
    projectData.Shaders.InputGeometry = {};
    projectData.Shaders.InputGeometry.type = geometryType;
    projectData.Shaders.InputGeometry.values = geometryValues;
    projectData.Shaders.Wireframe = wireframe;
    projectData.Shaders.BackgroundColor = backgroundColor;
    projectData.Shaders.Camera = {};
    projectData.Shaders.Camera.position = cameraPosition;
    projectData.Shaders.Camera.type = cameraType;
    projectData.Shaders.Camera.values = cameraValues;
    projectData.Shaders.Vertex = this._editor._vertexCode;
    projectData.Shaders.Fragment = this._editor._fragmentCode;
    projectData.Shaders.Uniforms = this._graphics.getUserUniforms();

    projectData.Shaders.Textures = this._graphics.getTextureSlotsMeta
      ? this._graphics.getTextureSlotsMeta()
      : undefined;

    projectData.Section = {};
    projectData.Section.Title = titleMd;
    projectData.Section.Content = contentMd;

    const name = prompt("Save as", "ChromaProject") || null;

    if (name !== null) {
      this._project.save(name);
    }
  }

  // @TODO: this can also be drag n drop
  async _onProjectLoad() {
    await this._project.load();
    this._setProject(this._project.get());
  }

  _insertTextAtCursor(editableEl, text) {
    editableEl.focus();
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!editableEl.contains(range.commonAncestorContainer)) {
        const r = document.createRange();
        r.selectNodeContents(editableEl);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    } else {
      const r = document.createRange();
      r.selectNodeContents(editableEl);
      r.collapse(false);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    const ok =
      document.execCommand && document.execCommand("insertText", false, text);
    if (!ok) {
      const s = window.getSelection && window.getSelection();
      if (s && s.rangeCount > 0) {
        s.deleteFromDocument();
        s.getRangeAt(0).insertNode(document.createTextNode(text));
      } else {
        editableEl.textContent = (editableEl.textContent || "") + text;
      }
    }
  }

  // Make fields available for editing
  _onProjectEdit() {
    const projectName = document.getElementById("project-name");
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");
    const editProjectButton = document.getElementById("edit-button");
    const saveProjectButton = document.getElementById("save-button");
    const loadProjectButton = document.getElementById("load-button");

    // Enter edit mode
    if (!this._editMode) {
      editProjectButton.textContent = "Finish Edit";

      projectName.contentEditable = true;
      tabTitle.contentEditable = true;
      tabContent.contentEditable = true;

      projectName.classList.add("tab-content-edit-mode");
      tabTitle.classList.add("tab-content-edit-mode");
      tabContent.classList.add("tab-content-edit-mode");

      // Hide buttons during editing
      saveProjectButton.classList.add("hide-button-edit-mode");
      loadProjectButton.classList.add("hide-button-edit-mode");

      projectName.textContent = this._convertToMarkdown(projectName.innerHTML);
      tabTitle.textContent = this._convertToMarkdown(tabTitle.innerHTML);
      tabContent.textContent = this._convertToMarkdown(tabContent.innerHTML);

      let addImgBtn = document.getElementById("add-image-button");
      let addImgInput = document.getElementById("add-image-input");

      if (!addImgBtn) {
        addImgBtn = document.createElement("button");
        addImgBtn.id = "add-image-button";
        addImgBtn.className = "button-type-1";
        addImgBtn.textContent = "Add image";
        const wrap = document.getElementById("project-buttons");
        wrap && wrap.prepend(addImgBtn);
      }
      if (!addImgInput) {
        addImgInput = document.createElement("input");
        addImgInput.type = "file";
        addImgInput.id = "add-image-input";
        addImgInput.accept = "image/*";
        addImgInput.style.display = "none";
        document.body.appendChild(addImgInput);
      }

      addImgBtn.onclick = () => addImgInput.click();

      addImgInput.onchange = async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const alt = prompt("Image alt/label:", f.name) || f.name;
        const info = await this._project.addImageFromFile(f, alt);
        const snippet = `\n\n${info.markdown}\n`;
        this._insertTextAtCursor(tabContent, snippet);
        e.target.value = "";
      };

      this._editMode = true;
    }

    // Exit edit mode
    else {
      editProjectButton.textContent = "Edit";

      projectName.contentEditable = false;
      tabTitle.contentEditable = false;
      tabContent.contentEditable = false;

      projectName.classList.remove("tab-content-edit-mode");
      tabTitle.classList.remove("tab-content-edit-mode");
      tabContent.classList.remove("tab-content-edit-mode");

      saveProjectButton.classList.remove("hide-button-edit-mode");
      loadProjectButton.classList.remove("hide-button-edit-mode");

      projectName.innerHTML = this._convertToHtml(projectName.textContent);
      tabTitle.innerHTML = this._convertToHtml(tabTitle.textContent);
      tabContent.innerHTML = this._convertToHtml(tabContent.textContent);

      const addImgBtn = document.getElementById("add-image-button");
      if (addImgBtn && addImgBtn.parentNode)
        addImgBtn.parentNode.removeChild(addImgBtn);
      const addImgInput = document.getElementById("add-image-input");
      if (addImgInput && addImgInput.parentNode)
        addImgInput.parentNode.removeChild(addImgInput);

      this._editMode = false;
    }
  }

  // Update the divs, the editor code and the graphics code
  _setProject(json) {
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");
    const projectName = document.getElementById("project-name");

    tabTitle.innerHTML = this._convertToHtml(json.Section.Title);
    tabContent.innerHTML = this._convertToHtml(json.Section.Content);
    projectName.innerHTML = this._convertToHtml(json.ProjectName);

    const vertexCode = json.Shaders.Vertex;
    const fragmentCode = json.Shaders.Fragment;
    const uniforms = json.Shaders.Uniforms;

    this._editor.setShaderCode(ShaderType.Vertex, vertexCode);
    this._editor.setShaderCode(ShaderType.Fragment, fragmentCode);

    this._graphics.setCameraPosition(json.Shaders.Camera.position);
    this._graphics.setCameraType(json.Shaders.Camera.type);
    this._graphics.setCameraValues(json.Shaders.Camera.values);
    this._graphics.setWireframe(json.Shaders.Wireframe);
    this._graphics.setBackgroundColor(json.Shaders.BackgroundColor);
    this._graphics.setInputGeometryType(json.Shaders.InputGeometry.type);
    this._graphics.setInputGeometryValues(json.Shaders.InputGeometry.values);
    this._graphics.onShaderCodeUpdate(vertexCode, fragmentCode);
    this._graphics.onUniformUpdate(uniforms);

    // restore iChannels from .chroma
    const channels = ["i0", "i1", "i2", "i3"];
    const texMeta = (json.Shaders && json.Shaders.Textures) || null;

    if (texMeta) {
      const restored = new Set();
      for (const [ch, meta] of Object.entries(texMeta)) {
        if (!meta) continue;
        const pack = this._project.getTextureForChannel(ch);
        if (pack && pack.url) {
          this._graphics.restoreTextureFromObjectUrl(
            ch,
            pack.url,
            pack.mime,
            meta.path
          );
          restored.add(ch);
        }
      }
      channels.forEach((ch) => {
        if (!texMeta[ch]) this._graphics.clearTextureChannel(ch);
      });
    } else {
      channels.forEach((ch) => this._graphics.clearTextureChannel(ch));
    }
  }

  _convertToHtml(markdownText) {
    const html = marked.parse(markdownText);
    const div = document.createElement("div");
    div.innerHTML = html;

    const imgs = div.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("image:")) {
        const id = src.slice(6);
        const url = this._project.getImageUrl(id);
        if (url) img.setAttribute("src", url);
      }
    });

    return div.innerHTML;
  }

  _convertToMarkdown(htmlText) {
    return this._turndownService.turndown(htmlText);
  }

  _editMode = false;
  _turndownService;
  _project;
  _graphics;
  _editor;
}

export { App };
