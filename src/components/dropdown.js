function setupDropdowns() {
  const inputGeometryDropdown = document.getElementById(
    "input-geometry-dropdown"
  );

  const backgroundColorDropdown = document.getElementById(
    "background-color-dropdown"
  );

  const cameraDropdown = document.getElementById("camera-dropdown");

  const inputGeometryDropdownButton =
    document.getElementById("input-geometry-btn");

  const backgroundColorDropdownButton = document.getElementById(
    "background-color-btn"
  );

  const cameraDropdownButton = document.getElementById("camera-btn");

  inputGeometryDropdownButton.addEventListener("click", (e) => {
    inputGeometryDropdown.classList.toggle("dropdown-show");
  });

  backgroundColorDropdownButton.addEventListener("click", (e) => {
    backgroundColorDropdown.classList.toggle("dropdown-show");
  });

  cameraDropdownButton.addEventListener("click", (e) => {
    cameraDropdown.classList.toggle("dropdown-show");
  });
}

export { setupDropdowns };
