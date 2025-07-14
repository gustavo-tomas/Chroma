// src/editor.js

import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";

class Editor {
  constructor(initialVertex, initialFragment, onUpdate) {
    this.vertexCode = initialVertex;
    this.fragmentCode = initialFragment;
    this.currentTab = "vertex";
    this.onUpdate = onUpdate;

    // tab buttons
    this.tabVertex = document.getElementById("tab-vertex");
    this.tabFragment = document.getElementById("tab-fragment");

    // run code, update the shader
    this.updateButton = document.getElementById("update-shader-btn");

    // initialize CodeMirror view
    this.view = new EditorView({
      doc: this.vertexCode,
      parent: document.querySelector("#editor"),
      extensions: [basicSetup],
    });

    this.updateButton.addEventListener("click", () => {
      const code = this.view.state.doc.toString();
      this.onUpdate(this.currentTab, code);
    });

    // attach click handlers to switch tabs
    this.tabVertex.addEventListener("click", () => this.switchTab("vertex"));
    this.tabFragment.addEventListener("click", () =>
      this.switchTab("fragment")
    );

    // set initial active styles
    this._updateTabStyles();
  }

  setVertexCode(vertexCode) {
    // @TODO: switching tabs is a bit of a hack but works fine
    this.switchTab("vertex");
    this.vertexCode = vertexCode;

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: this.vertexCode,
      },
    });
  }

  setFragmentCode(fragmentCode) {
    this.switchTab("fragment");
    this.fragmentCode = fragmentCode;

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: this.fragmentCode,
      },
    });
  }

  switchTab(tabName) {
    if (tabName === this.currentTab) return;

    // save current content
    const currentText = this.view.state.doc.toString();
    if (this.currentTab === "vertex") {
      this.vertexCode = currentText;
    } else {
      this.fragmentCode = currentText;
    }

    // update state
    this.currentTab = tabName;

    // load the new buffer into the view
    const newText = tabName === "vertex" ? this.vertexCode : this.fragmentCode;

    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: newText },
    });

    this._updateTabStyles();
  }

  _updateTabStyles() {
    this.tabVertex.classList.toggle("active", this.currentTab === "vertex");
    this.tabFragment.classList.toggle("active", this.currentTab === "fragment");
  }
}

export { Editor };
