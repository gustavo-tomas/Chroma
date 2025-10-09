import { ShaderType } from "./common.js";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { lintGutter, linter, setDiagnostics } from "@codemirror/lint";

class Editor {
  constructor(initialVertex, initialFragment, onUpdate) {
    this.vertexCode = initialVertex;
    this.fragmentCode = initialFragment;
    this.currentTab = ShaderType.Vertex;
    this.onUpdate = onUpdate;

    const validationCanvas = document.createElement("canvas");
    this.gl =
      validationCanvas.getContext("webgl2") ||
      validationCanvas.getContext("webgl");

    // tab buttons
    this.tabVertex = document.getElementById("tab-vertex");
    this.tabFragment = document.getElementById("tab-fragment");

    // run code, update the shader
    this.updateButton = document.getElementById("update-shader-btn");

    // initialize CodeMirror view
    this.view = new EditorView({
      doc: this.vertexCode,
      parent: document.querySelector("#editor"),
      extensions: [basicSetup, lintGutter(), linter(() => [])],
    });

    this.updateButton.addEventListener("click", () => {
      const code = this.view.state.doc.toString();

      // Unconditionally update the shader
      const errorLog = this.onUpdate(this.currentTab, code);

      // collect diagnostics only at the exact position of the token with the error
      const info = errorLog
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/No precision specified/.test(l));

      const diags = [];

      if (info.length) {
        const first = info[0];
        const m = first.match(/ERROR:\s*\d+:(\d+):\s*'(.*?)'/);
        const lineNum = m ? parseInt(m[1], 10) : 1;
        const token = m && m[2] ? m[2] : null;
        const line = this.view.state.doc.line(lineNum);
        let from = line.from,
          to = line.to;
        if (token) {
          const text = this.view.state.doc.sliceString(line.from, line.to);
          const idx = text.indexOf(token);
          if (idx >= 0) {
            from = line.from + idx;
            to = from + token.length;
          }
        }
        diags.push({ from, to, severity: "error", message: first });
      }

      // Apply the diagnostics (an empty list will clear them)
      this.view.dispatch(setDiagnostics(this.view.state, diags));
    });

    // attach click handlers to switch tabs
    this.tabVertex.addEventListener("click", () =>
      this._switchTab(ShaderType.Vertex)
    );
    this.tabFragment.addEventListener("click", () =>
      this._switchTab(ShaderType.Fragment)
    );

    // set initial active styles
    this._updateTabStyles();
  }

  setShaderCode(tab, code) {
    // @TODO: switching tabs is a bit of a hack but works fine
    this._switchTab(tab);

    if (tab === ShaderType.Vertex) {
      this.vertexCode = code;
    } else {
      this.fragmentCode = code;
    }

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: code,
      },
    });
  }

  _switchTab(tabType) {
    if (tabType === this.currentTab) return;

    // save current content
    const currentText = this.view.state.doc.toString();
    if (this.currentTab === ShaderType.Vertex) {
      this.vertexCode = currentText;
    } else {
      this.fragmentCode = currentText;
    }

    // update state
    this.currentTab = tabType;

    // load the new buffer into the view
    const newText =
      tabType === ShaderType.Vertex ? this.vertexCode : this.fragmentCode;

    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: newText },
    });

    this._updateTabStyles();
  }

  _updateTabStyles() {
    this.tabVertex.classList.toggle(
      "active",
      this.currentTab === ShaderType.Vertex
    );
    this.tabFragment.classList.toggle(
      "active",
      this.currentTab === ShaderType.Fragment
    );
  }
}

export { Editor };
