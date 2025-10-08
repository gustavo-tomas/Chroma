import "./style.css";
import { Graphics } from "./graphics.js";
import { Editor } from "./editor.js";
import { setupResizers } from "./resizer.js";
import Showdown from "showdown";

class App {
  async init() {
    this._markdownConverter = new Showdown.Converter();
    this._markdownConverter.setOption("openLinksInNewWindow", true);

    const json = await this.loadDefaultProject();
    const vertexCode = json.Shaders.Vertex;
    const fragmentCode = json.Shaders.Fragment;

    this.graphics = new Graphics(vertexCode, fragmentCode);
    this.editor = new Editor(
      vertexCode,
      fragmentCode,
      this.onEditorUpdate.bind(this)
    );
    setupResizers(this.graphics);

    this.setProject(json);

    const editProjectButton = document.getElementById("edit-button");
    const saveProjectButton = document.getElementById("save-button");
    const loadProjectButton = document.getElementById("load-button");

    editProjectButton.onclick = this.onProjectEdit.bind(this);
    saveProjectButton.onclick = this.onProjectSave.bind(this);
    loadProjectButton.onclick = this.onProjectLoad.bind(this);
  }

  async loadDefaultProject() {
    try {
      const response = await fetch("./projects/brute.json");
      const data = await response.json();
      console.log("Loaded default project:", data);
      return data;
    } catch (error) {
      console.error("Error loading default project:", error);
    }
  }

  // Update the divs, the editor code and the graphics code
  setProject(json) {
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");
    const projectName = document.getElementById("project-name");

    tabTitle.innerHTML = this._convertToHtml(json.Section.Title);
    tabContent.innerHTML = this._convertToHtml(json.Section.Content);
    projectName.innerHTML = this._convertToHtml(json.ProjectName);

    const vertexCode = json.Shaders.Vertex;
    const fragmentCode = json.Shaders.Fragment;
    const uniforms = json.Shaders.Uniforms;

    this.editor.setVertexCode(vertexCode);
    this.editor.setFragmentCode(fragmentCode);

    this.graphics.onVertexCodeUpdate(vertexCode);
    this.graphics.onFragmentCodeUpdate(fragmentCode);
    this.graphics.onUniformUpdate(uniforms);
  }

  // Build project from current data
  getProject() {
    const projectName = this._convertToMarkdown(
      document.getElementById("project-name").innerHTML
    );
    const tabTitle = this._convertToMarkdown(
      document.getElementById("tab-title").innerHTML
    );
    const tabContent = this._convertToMarkdown(
      document.getElementById("tab-content").innerHTML
    );

    const project = new Object();
    project.ProjectName = projectName;
    project.Shaders = {};
    project.Shaders.Vertex = this.editor.vertexCode;
    project.Shaders.Fragment = this.editor.fragmentCode;
    project.Shaders.Uniforms = this.graphics.getUserUniforms();
    project.Section = {};
    project.Section.Title = tabTitle;
    project.Section.Content = tabContent;

    return project;
  }

  // Create a json, retrieve section information and code from the editor
  onProjectSave() {
    const project = this.getProject();

    // Convert object to JSON string
    const json = JSON.stringify(project, null, 2); // null, 2 for pretty formatting

    // Create a Blob with the JSON data
    const blob = new Blob([json], { type: "application/json" });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = project.ProjectName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Saved project: ", project);
  }

  // @TODO: this can also be drag n drop
  onProjectLoad() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = event.target.files[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          this.setProject(json);

          console.log("Project loaded:", json);
        } catch (error) {
          alert("Error loading project file: " + error.message);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  // Make fields available for editing
  onProjectEdit() {
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

  onEditorUpdate(tab, code) {
    let errorLog = "";

    if (tab === "vertex") {
      errorLog = this.graphics.onVertexCodeUpdate(code);
    } else {
      errorLog = this.graphics.onFragmentCodeUpdate(code);
    }

    return errorLog;
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
}

export { App };
