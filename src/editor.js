import { ShaderType } from "./common.js";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { LRLanguage } from "@codemirror/language";
import { parser } from "lezer-glsl";

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

class EditorConstructorParams {
  initialVertex = "";
  initialFragment = "";
}

class Editor {
  constructor(params) {
    this._currentTab = TabType.Vertex;

    this._shaderDisplayVertex = document.querySelector("#vertex-shader-view");
    this._shaderDisplayFragment = document.querySelector(
      "#fragment-shader-view"
    );
    this._geometryDisplay = document.querySelector("#geometry");
    this._geometryInputs = document.querySelector("#geometry-btn-group");

    // tabs
    const geometryTab = new Tab();
    geometryTab.type = TabType.Geometry;
    geometryTab.button = document.getElementById("tab-geometry");
    geometryTab.display = this._geometryDisplay;

    const vertexTab = new Tab();
    vertexTab.type = TabType.Vertex;
    vertexTab.button = document.getElementById("tab-vertex");
    vertexTab.display = this._shaderDisplayVertex;

    const fragmentTab = new Tab();
    fragmentTab.type = TabType.Fragment;
    fragmentTab.button = document.getElementById("tab-fragment");
    fragmentTab.display = this._shaderDisplayFragment;

    // We can also access this as a map using indices if necessary
    this._tabs = [geometryTab, vertexTab, fragmentTab];

    // initialize CodeMirror view
    this._vertexView = new EditorView({
      doc: params.initialVertex,
      parent: this._shaderDisplayVertex,
      extensions: [
        basicSetup,
        lintGutter(),
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        LRLanguage.define({ parser: parser }), // glsl syntax highlighting
      ],
    });

    this._fragmentView = new EditorView({
      doc: params.initialFragment,
      parent: this._shaderDisplayFragment,
      extensions: [
        basicSetup,
        lintGutter(),
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        LRLanguage.define({ parser: parser }), // glsl syntax highlighting
      ],
    });

    // attach click handlers to switch tabs
    this._tabs.forEach((tab) => {
      tab.button.addEventListener("click", () => this._switchTab(tab.type));
    });

    this._diagnosticsVertex = [];
    this._diagnosticsFragment = [];

    // set initial active styles
    this._updateTabStyles();
  }

  onUpdate(shaderType, shaderLogs) {
    // collect diagnostics only at the exact position of the token with the error
    const diagnostics = [];

    const view =
      shaderType === TabType.Vertex ? this._vertexView : this._fragmentView;

    shaderLogs.forEach((shaderLog) => {
      const line = view.state.doc.line(shaderLog.lineNumber);
      let from = line.from;
      let to = line.to;

      if (shaderLog.token) {
        const text = view.state.doc.sliceString(line.from, line.to);
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

    shaderType === TabType.Vertex
      ? (this._diagnosticsVertex = diagnostics)
      : (this._diagnosticsFragment = diagnostics);

    if (diagnostics.length > 0) {
      const errorPosition = diagnostics[0].from;
      this._switchTab(shaderType, errorPosition);
    }

    this._updateTabStyles();
  }

  setShaderCode(tab, code) {
    const view = tab === TabType.Vertex ? this._vertexView : this._fragmentView;

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: code,
      },
    });
  }

  getCurrentShaderCode(type) {
    return type === TabType.Vertex
      ? this._vertexView.state.doc.toString()
      : this._fragmentView.state.doc.toString();
  }

  _switchTab(tabType, cursorPosition = -1) {
    // update state
    this._currentTab = tabType;

    // focus on active editor
    if (tabType === TabType.Vertex || tabType === TabType.Fragment) {
      const view =
        tabType === TabType.Vertex ? this._vertexView : this._fragmentView;

      view.focus();

      if (cursorPosition >= 0) {
        view.dispatch({
          selection: { anchor: cursorPosition, head: cursorPosition },
          effects: EditorView.scrollIntoView(cursorPosition, {
            y: "center",
            yMargin: 0,
          }),
        });
      }
    }

    this._updateTabStyles();
  }

  _updateTabStyles() {
    // buttons
    this._tabs.forEach((tab) => {
      tab.button.classList.toggle("active", this._currentTab === tab.type);
    });

    // display
    this._tabs.forEach((tab) => {
      if (this._currentTab === tab.type) {
        tab.display.classList.add("active-tab");
      } else {
        tab.display.classList.remove("active-tab");
      }
    });

    // Apply the diagnostics (an empty list will clear them)
    this._vertexView.dispatch(
      setDiagnostics(this._vertexView.state, this._diagnosticsVertex)
    );
    this._fragmentView.dispatch(
      setDiagnostics(this._fragmentView.state, this._diagnosticsFragment)
    );
  }
}

export { Editor, EditorConstructorParams };
