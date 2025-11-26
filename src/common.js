// Small enum to keep things tidy
const ShaderType = {
  Vertex: "vertex",
  Fragment: "fragment",
};

const InputGeometryTypes = {
  Plane: "plane",
  Box: "box",
};

const CameraTypes = {
  Perspective: "perspective",
  Orthographic: "orthographic",
};

const FileTypes = {
  Unknown: "unknown",
  Image: "image",
  Chroma: "chroma",
};

function getFileType(file) {
  const type = file.type;

  // Chroma
  if (
    type === "" || // @TODO: This is unfortunate
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/x-zip"
  ) {
    return FileTypes.Chroma;
  }

  // Image
  if (type.startsWith("image/")) {
    return FileTypes.Image;
  }

  return FileTypes.Unknown;
}

export { ShaderType, InputGeometryTypes, CameraTypes, FileTypes, getFileType };
