// src/editor.js
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'

function initializeEditor() {
  const view = new EditorView({
    doc: "Start document",
    parent: document.querySelector('#editor'), 
    extensions: [
      basicSetup,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          // get the full text as a string
          const code = view.state.doc.toString()
          // print it to the console
          console.log(code)
        }
      })
    ]
  })
}

export { initializeEditor }
