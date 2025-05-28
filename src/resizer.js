function setupResizers(graphics) {
  const theoryTab = document.getElementById("theory-tab");
  const hResizer = document.getElementById("h-resizer");
  hResizer.addEventListener("mousedown", initHResize);

  function initHResize(e) {
    e.preventDefault();
    document.addEventListener("mousemove", doHResize);
    document.addEventListener("mouseup", stopHResize);
  }

  function doHResize(e) {
    const newWidth = e.clientX - theoryTab.getBoundingClientRect().left;
    theoryTab.style.width = `${newWidth}px`;
    graphics.onResize();
  }

  function stopHResize() {
    document.removeEventListener("mousemove", doHResize);
    document.removeEventListener("mouseup", stopHResize);
  }

  const codePanel = document.getElementById("code-panel");
  const vResizer = document.getElementById("v-resizer");
  vResizer.addEventListener("mousedown", initVResize);

  function initVResize(e) {
    e.preventDefault();
    document.addEventListener("mousemove", doVResize);
    document.addEventListener("mouseup", stopVResize);
  }

  function doVResize(e) {
    const top = codePanel.getBoundingClientRect().top;
    const height = e.clientY - top;
    codePanel.style.height = `${height}px`;
    graphics.onResize();
  }

  function stopVResize() {
    document.removeEventListener("mousemove", doVResize);
    document.removeEventListener("mouseup", stopVResize);
  }
}

export { setupResizers };
