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

    this.setupProject(json);

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
  setupProject(json) {
    const tabTitle = document.getElementById("tab-title");
    const tabContent = document.getElementById("tab-content");

    tabTitle.textContent = json.Section.Title;
    tabContent.textContent = json.Section.Content;

    const vertexCode = json.Shaders.Vertex;
    const fragmentCode = json.Shaders.Fragment;

    this.editor.vertexCode = vertexCode;
    this.editor.fragmentCode = fragmentCode;

    this.graphics.onVertexCodeUpdate(vertexCode);
    this.graphics.onFragmentCodeUpdate(fragmentCode);
  }

  // @TODO: finish. create a json, retrieve section information and code from the editor
  onProjectSave() {
    console.log("save");
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
          this.setupProject(json);

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
