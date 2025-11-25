function appendTexSlot(dataChannel) {
  const texSlot = document.createElement("div");
  texSlot.setAttribute("class", "tex-slot");
  texSlot.setAttribute("data-channel", dataChannel);

  const texLabel = document.createElement("div");
  texLabel.setAttribute("class", "tex-label");
  texLabel.innerText = dataChannel;

  const texActions = document.createElement("div");
  texActions.setAttribute("class", "tex-actions");

  const texBtnLoad = document.createElement("button");
  texBtnLoad.setAttribute("class", "tex-btn tex-load button-type-2");
  texBtnLoad.innerText = "Load";

  const texBtnClear = document.createElement("button");
  texBtnClear.setAttribute("class", "tex-btn tex-clear button-type-2");
  texBtnClear.innerText = "Clear";

  const texInput = document.createElement("input");
  texInput.setAttribute("type", "file");
  texInput.setAttribute("accept", "image/*");
  texInput.hidden = true;

  texActions.appendChild(texBtnLoad);
  texActions.appendChild(texBtnClear);

  texSlot.appendChild(texLabel);
  texSlot.appendChild(texActions);
  texSlot.appendChild(texInput);

  document.getElementById("textures-panel").appendChild(texSlot);
}

export { appendTexSlot };
