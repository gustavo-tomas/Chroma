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

  onUpdate(errorLog) {
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
      const line = this._view.state.doc.line(lineNum);
      let from = line.from,
        to = line.to;
      if (token) {
        const text = this._view.state.doc.sliceString(line.from, line.to);
        const idx = text.indexOf(token);
        if (idx >= 0) {
          from = line.from + idx;
          to = from + token.length;
        }
      }
      diags.push({ from, to, severity: "error", message: first });
    }

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

  getCurrentTab() {
    return this._currentTab;
  }

  getCurrentShaderCode() {
    if (this._currentTab === ShaderType.Vertex) {
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
