import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";

class Editor {
  constructor(documentText, onDocumentUpdateCallback) {
    const view = new EditorView({
      doc: documentText,
      parent: document.querySelector("#editor"),
      extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // get the full text as a string
            const code = view.state.doc.toString();

            // send text to the listener
            onDocumentUpdateCallback(code);
          }
        }),
      ],
    });
  }
}

export { Editor };
