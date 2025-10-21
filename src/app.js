import "./style.css";
import { ShaderType, InputGeometryTypes } from "./common.js";
import { Graphics, GraphicsConstructorParams } from "./graphics.js";
import { Editor } from "./editor.js";
import { Project } from "./project.js";
import { setupResizers } from "./resizer.js";
import Showdown from "showdown";

class App {
  async init() {
    this._markdownConverter = new Showdown.Converter();
    this._markdownConverter.setOption("openLinksInNewWindow", true);
    this._project = new Project();

    await this._project.loadDefault();

    const projectData = this._project.get();
    const vertexCode = projectData.Shaders.Vertex;
    const fragmentCode = projectData.Shaders.Fragment;
    const inputGeometryType = projectData.Shaders.InputGeometry.type;
    const inputGeometryValues = projectData.Shaders.InputGeometry.values;

    const graphicsParams = new GraphicsConstructorParams();
    graphicsParams.vertexCode = vertexCode;
    graphicsParams.fragmentCode = fragmentCode;
    graphicsParams.inputGeometryType = inputGeometryType;
    graphicsParams.inputGeometryValues = inputGeometryValues;
    graphicsParams.onShaderCompileCallback = this._onShaderCompile.bind(this);

    this._graphics = new Graphics(graphicsParams);

    this._editor = new Editor(vertexCode, fragmentCode);

    setupResizers(this._graphics);

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
      this._onProjectSave();
    }

    // Load project shortcut
    else if (ctrlPressed && e.code === "KeyO") {
      e.preventDefault();
      this._onProjectLoad();
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

  // Create a json, retrieve section information and code from the editor
  _onProjectSave() {
    const projectData = this._project.get();

    const projectName = document.getElementById("project-name");
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");
    const geometryType = this._graphics.getActiveInputGeometryType();
    const geometryValues = this._graphics.getInputGeometryValues(geometryType);

    projectData.ProjectName = this._convertToMarkdown(projectName.innerHTML);
    projectData.Shaders = {};
    projectData.Shaders.InputGeometry = {};
    projectData.Shaders.InputGeometry.type = geometryType;
    projectData.Shaders.InputGeometry.values = geometryValues;
    projectData.Shaders.Vertex = this._editor._vertexCode;
    projectData.Shaders.Fragment = this._editor._fragmentCode;
    projectData.Shaders.Uniforms = this._graphics.getUserUniforms();
    projectData.Section = {};
    projectData.Section.Title = this._convertToMarkdown(tabTitle.innerHTML);
    projectData.Section.Content = this._convertToMarkdown(tabContent.innerHTML);

    this._project.save();
  }

  // @TODO: this can also be drag n drop
  async _onProjectLoad() {
    await this._project.load();
    this._setProject(this._project.get());
  }

  // Make fields available for editing
  _onProjectEdit() {
    const projectName = document.getElementById("project-name");
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");
    const editProjectButton = document.getElementById("edit-button");

    // Enter edit mode
    if (!this._editMode) {
      editProjectButton.textContent = "Finish Edit";

      projectName.contentEditable = true;
      tabTitle.contentEditable = true;
      tabContent.contentEditable = true;

      projectName.innerText = this._convertToMarkdown(projectName.innerHTML);
      tabTitle.innerText = this._convertToMarkdown(tabTitle.innerHTML);
      tabContent.innerText = this._convertToMarkdown(tabContent.innerHTML);

      this._editMode = true;
    }

    // Exit edit mode
    else {
      editProjectButton.textContent = "Edit";

      projectName.contentEditable = false;
      tabTitle.contentEditable = false;
      tabContent.contentEditable = false;

      projectName.innerHTML = this._convertToHtml(projectName.innerText);
      tabTitle.innerHTML = this._convertToHtml(tabTitle.innerText);
      tabContent.innerHTML = this._convertToHtml(tabContent.innerText);

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

    this._graphics.onShaderCodeUpdate(vertexCode, fragmentCode);
    this._graphics.onUniformUpdate(uniforms);
  }

  _convertToHtml(markdownText) {
    return this._markdownConverter.makeHtml(markdownText);
  }

  _convertToMarkdown(htmlText) {
    // @NOTE: Showdown adds some comments at the bottom, so we need to remove them

    return this._markdownConverter
      .makeMarkdown(htmlText)
      .replace(/<!-- -->/g, "")
      .trim();
  }

  _editMode = false;
  _markdownConverter;
  _project;
  _graphics;
  _editor;
}

export { App };
