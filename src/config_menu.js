import { defaultEditorExtensions } from "./editor";
import { vim } from "@replit/codemirror-vim"

function registerConfigMenuEvents(editor) {
  const configButton = document.getElementById("config-button");
  const configOverlay = document.getElementById("config-menu-overlay");
  const selectKeybind = document.getElementById("select-keybind");

  // menu visibility
  configOverlay.addEventListener("click", (event) => {
    // only run if the overlay is the toppest element
    if (event.target === event.currentTarget) {
      document.getElementById("config-menu-overlay").style.visibility = "hidden";
    }
  });

  configButton.addEventListener("click", () => {
    document.getElementById("config-menu-overlay").style.visibility = "visible";
  })

  // keybinds
  const vimEditorExtensions = [...defaultEditorExtensions]; //array copy trick
  vimEditorExtensions.push(vim({status: true}));

  const runCodeButton = document.getElementById("update-shader-btn");

  selectKeybind.addEventListener("change", (event) => {
    if (event.target.value === "default") {
      editor.reconfigureEditorViews(defaultEditorExtensions);

      // removes the extre status bar space
      runCodeButton.style.marginBottom = "0px";
    } else if (event.target.value == "vim") {
      editor.reconfigureEditorViews(vimEditorExtensions);

      // adds a little of space bellow to make for the status bar
      runCodeButton.style.marginBottom = "8px";
    }
  })
}

export { registerConfigMenuEvents }
