import { ShaderType } from "./common.js";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { lintGutter, setDiagnostics } from "@codemirror/lint";

const TabType = {
  Geometry: "geometry",
  Vertex: ShaderType.Vertex, // keep parity with shader types
  Fragment: ShaderType.Fragment,
};

class Tab {
  type;
  button;
  display;
}

class Editor {
  constructor(initialVertex, initialFragment, onInputGeometrySelectedCallback) {
    this._vertexCode = initialVertex;
    this._fragmentCode = initialFragment;
    this._currentTab = TabType.Vertex;
    this._onInputGeometrySelectedCallback = onInputGeometrySelectedCallback;

    this._shaderDisplay = document.querySelector("#shader");
    this._geometryDisplay = document.querySelector("#geometry");
    this._geometryInputs = document.querySelector("#geometry-btn-group");

    this._geometryInputButtons =
      document.getElementsByClassName("geometry-btn");

    // tabs
    const geometryTab = new Tab();
    geometryTab.type = TabType.Geometry;
    geometryTab.button = document.getElementById("tab-geometry");
    geometryTab.display = this._geometryDisplay;

    const vertexTab = new Tab();
    vertexTab.type = TabType.Vertex;
    vertexTab.button = document.getElementById("tab-vertex");
    vertexTab.display = this._shaderDisplay;

    const fragmentTab = new Tab();
    fragmentTab.type = TabType.Fragment;
    fragmentTab.button = document.getElementById("tab-fragment");
    fragmentTab.display = this._shaderDisplay;

    // We can also access this as a map using indices if necessary
    this._tabs = [geometryTab, vertexTab, fragmentTab];

    // initialize CodeMirror view
    this._view = new EditorView({
      doc: this._vertexCode,
      parent: this._shaderDisplay,
      extensions: [basicSetup, lintGutter()],
    });

    // attach click handlers to switch tabs
    this._tabs.forEach((tab) => {
      tab.button.addEventListener("click", () => this._switchTab(tab.type));
    });

    for (let i = 0; i < this._geometryInputButtons.length; i++) {
      const button = this._geometryInputButtons[i];
      button.addEventListener(
        "change",
        this._onInputGeometrySelected.bind(this)
      );
    }

    this._shaderDisplay.addEventListener("keyup", (e) => {
      this._onKeyUp(e);
    });

    this._diagnosticsVertex = [];
    this._diagnosticsFragment = [];

    // set initial active styles
    this._updateTabStyles();
  }

  onUpdate(shaderType, shaderLogs) {
    const oldTab = this._currentTab;

    // Switch tabs to get diagnostics for this shader. If everything is ok, we
    // go back to the old tab. If not, we display the error in the current tab.

    this._switchTab(shaderType);

    // collect diagnostics only at the exact position of the token with the error
    const diagnostics = [];

    shaderLogs.forEach((shaderLog) => {
      const line = this._view.state.doc.line(shaderLog.lineNumber);
      let from = line.from;
      let to = line.to;

      if (shaderLog.token) {
        const text = this._view.state.doc.sliceString(line.from, line.to);
        const idx = text.indexOf(shaderLog.token);
        if (idx >= 0) {
          from = line.from + idx;
          to = from + shaderLog.token.length;
        }
      }

      diagnostics.push({
        from,
        to,
        severity: "error",
        message: shaderLog.errorMessage,
      });
    });

    if (this._currentTab === TabType.Vertex) {
      this._diagnosticsVertex = diagnostics;
    } else if (this._currentTab === TabType.Fragment) {
      this._diagnosticsFragment = diagnostics;
    }

    if (diagnostics.length === 0) {
      this._switchTab(oldTab);
    }

    this._updateTabStyles();
  }

  setShaderCode(tab, code) {
    // @TODO: switching tabs is a bit of a hack but works fine
    this._switchTab(tab);

    if (tab === TabType.Vertex) {
      this._vertexCode = code;
    } else if (tab === TabType.Fragment) {
      this._fragmentCode = code;
    }

    this._view.dispatch({
      changes: {
        from: 0,
        to: this._view.state.doc.length,
        insert: code,
      },
    });
  }

  getCurrentShaderCode(type) {
    if (type === TabType.Vertex) {
      return this._vertexCode;
    } else if (type === TabType.Fragment) {
      return this._fragmentCode;
    }
  }

  _saveCurrentText() {
    const currentText = this._view.state.doc.toString();

    if (this._currentTab === TabType.Vertex) {
      this._vertexCode = currentText;
    } else if (this._currentTab === TabType.Fragment) {
      this._fragmentCode = currentText;
    }
  }

  _onKeyUp(e) {
    this._saveCurrentText();
  }

  _onInputGeometrySelected(e) {
    const button = e.target;
    if (button.checked) {
      this._onInputGeometrySelectedCallback(button.id);
    }
  }

  _switchTab(tabType) {
    if (tabType === this._currentTab) {
      return;
    }

    this._saveCurrentText();

    // update state
    this._currentTab = tabType;

    // load the new buffer into the view
    if (tabType === TabType.Vertex || tabType === TabType.Fragment) {
      const newText =
        tabType === TabType.Vertex ? this._vertexCode : this._fragmentCode;

      this._view.dispatch({
        changes: { from: 0, to: this._view.state.doc.length, insert: newText },
      });
    }

    this._updateTabStyles();
  }

  _toggleGeometryTab(visible) {
    if (visible) {
      this._shaderDisplay.style.visibility = "hidden";
      this._geometryDisplay.style.display = "block";
    } else {
      this._shaderDisplay.style.visibility = "visible";
      this._geometryDisplay.style.display = "none";
    }
  }

  _updateTabStyles() {
    // buttons
    this._tabs.forEach((tab) => {
      tab.button.classList.toggle("active", this._currentTab === tab.type);
    });

    this._toggleGeometryTab(this._currentTab === TabType.Geometry);

    // Apply the diagnostics (an empty list will clear them)
    if (this._currentTab === TabType.Vertex) {
      this._view.dispatch(
        setDiagnostics(this._view.state, this._diagnosticsVertex)
      );
    } else if (this._currentTab === TabType.Fragment) {
      this._view.dispatch(
        setDiagnostics(this._view.state, this._diagnosticsFragment)
      );
    }
  }
}

export { Editor };
