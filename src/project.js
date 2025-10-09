class Project {
  constructor() {
    this._project = new Object();
  }

  async loadDefault() {
    try {
      await fetch("./projects/brute.json")
        .then((response) => response.json())
        .then((json) => (this._project = json));
    } catch (error) {
      console.error("Error loading default project:", error);
    }
  }

  async load() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.onchange = (event) => {
        const file = event.target.files[0];

        if (!file) {
          reject(new Error("No file selected"));
          return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result);
            this._project = json;
            console.log("Project loaded:", this._project);
            resolve(json);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(new Error("Error reading file"));
        };

        reader.readAsText(file);
      };

      input.oncancel = () => {
        reject(new Error("File selection cancelled"));
      };

      input.click();
    });
  }

  save() {
    const json = JSON.stringify(this._project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = this._project.ProjectName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Saved project: ", this._project);
  }

  get() {
    return this._project;
  }

  _project;
}

export { Project };
