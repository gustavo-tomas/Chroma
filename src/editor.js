import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'

function initializeEditor() {
    const view = new EditorView({
        doc: "Start document",
        parent: document.querySelector('#editor'),
        extensions: [basicSetup]
    })
}

export { initializeEditor }
