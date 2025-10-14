import { ShaderType } from "./common.js";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { lintGutter, linter, setDiagnostics } from "@codemirror/lint";

class Editor {
  constructor(initialVertex, initialFragment) {
    this._vertexCode = initialVertex;
    this._fragmentCode = initialFragment;
    this._currentTab = ShaderType.Vertex;

    // tab buttons
    this._editor = document.querySelector("#editor");
    this._tabVertex = document.getElementById("tab-vertex");
    this._tabFragment = document.getElementById("tab-fragment");

    // initialize CodeMirror view
    this._view = new EditorView({
      doc: this._vertexCode,
      parent: this._editor,
      extensions: [basicSetup, lintGutter(), linter(() => [])],
    });

    // attach click handlers to switch tabs
    this._tabVertex.addEventListener("click", () =>
      this._switchTab(ShaderType.Vertex)
    );
    this._tabFragment.addEventListener("click", () =>
      this._switchTab(ShaderType.Fragment)
    );

    this._editor.addEventListener("keyup", (e) => {
      this._onKeyUp(e);
    });

    // set initial active styles
    this._updateTabStyles();
  }

  onUpdate(shaderType, shaderLog) {
    if (!shaderLog.errorMessage.length) {
      return;
    }

    // collect diagnostics only at the exact position of the token with the error
    const diags = [];

    this._switchTab(shaderType);

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

    diags.push({
      from,
      to,
      severity: "error",
      message: shaderLog.errorMessage,
    });

    // Apply the diagnostics (an empty list will clear them)
    this._view.dispatch(setDiagnostics(this._view.state, diags));
  }

  setShaderCode(tab, code) {
    // @TODO: switching tabs is a bit of a hack but works fine
    this._switchTab(tab);

    if (tab === ShaderType.Vertex) {
      this._vertexCode = code;
    } else {
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
    if (type === ShaderType.Vertex) {
      return this._vertexCode;
    } else {
      return this._fragmentCode;
    }
  }

  _saveCurrentText() {
    const currentText = this._view.state.doc.toString();

    if (this._currentTab === ShaderType.Vertex) {
      this._vertexCode = currentText;
    } else {
      this._fragmentCode = currentText;
    }
  }

  _onKeyUp(e) {
    this._saveCurrentText();
  }

  _switchTab(tabType) {
    if (tabType === this._currentTab) {
      return;
    }

    this._saveCurrentText();

    // update state
    this._currentTab = tabType;

    // load the new buffer into the view
    const newText =
      tabType === ShaderType.Vertex ? this._vertexCode : this._fragmentCode;

    this._view.dispatch({
      changes: { from: 0, to: this._view.state.doc.length, insert: newText },
    });

    this._updateTabStyles();
  }

  _updateTabStyles() {
    this._tabVertex.classList.toggle(
      "active",
      this._currentTab === ShaderType.Vertex
    );
    this._tabFragment.classList.toggle(
      "active",
      this._currentTab === ShaderType.Fragment
    );
  }
}

export { Editor };
