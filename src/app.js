import "./style.css";
import { Graphics } from "./graphics.js";
import { Editor } from "./editor.js";
import { setupResizers } from "./resizer.js";

class App {
  async init() {
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

    const saveProjectButton = document.getElementById("save-button");
    const loadProjectButton = document.getElementById("load-button");

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

    tabTitle.textContent = json.Section.Title;
    tabContent.textContent = json.Section.Content;
    projectName.textContent = json.ProjectName;

    const vertexCode = json.Shaders.Vertex;
    const fragmentCode = json.Shaders.Fragment;

    this.editor.vertexCode = vertexCode;
    this.editor.fragmentCode = fragmentCode;

    this.graphics.onVertexCodeUpdate(vertexCode);
    this.graphics.onFragmentCodeUpdate(fragmentCode);
  }

  // Build project from current data
  getProject() {
    const projectName = document.getElementById("project-name").textContent;
    const tabTitle = document.getElementById("tab-title").textContent;
    const tabContent = document.getElementById("tab-content").textContent;

    const project = new Object();
    project.ProjectName = projectName;
    project.Shaders = {};
    project.Shaders.Vertex = this.editor.vertexCode;
    project.Shaders.Fragment = this.editor.fragmentCode;
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

  onEditorUpdate(tab, code) {
    if (tab === "vertex") {
      this.graphics.onVertexCodeUpdate(code);
    } else {
      this.graphics.onFragmentCodeUpdate(code);
    }
  }
}

export { App };
