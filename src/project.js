import JSZip from "jszip";

class Project {
  constructor() {
    this._project = new Object();
    this._images = new Map();
    this._textures = {};
  }

  async addImageFromFile(file, alt) {
    const id = this._uuid4();
    const blob = file;
    const mime = file.type || this._guessMimeFromName(file.name);
    const objectUrl = URL.createObjectURL(blob);
    this._images.set(id, { objectUrl, blob, mime });
    return {
      id,
      objectUrl,
      markdown: `![${alt || file.name || "image"}](${`image:${id}`})`,
    };
  }

  async loadDefault() {
    try {
      const defaultProjectFilePath = "./projects/DefaultProject.chroma";

      await fetch(defaultProjectFilePath, { cache: "no-cache" })
        .then((response) => response.arrayBuffer())
        .then(async (data) => {
          const file = new File([data], defaultProjectFilePath);
          await this._loadChroma(file);
        });
    } catch (error) {
      console.error("Error loading default project:", error);
    }
  }

  async load() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".chroma,.json";

      input.onchange = async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) {
            reject(new Error("No file selected"));
            return;
          }

          if (file.name.toLowerCase().endsWith(".chroma")) {
            await this._loadChroma(file);
            resolve(this._project);
          } else {
            const text = await file.text();
            const json = JSON.parse(text);
            this._project = json;
            this._images.clear();
            this._textures = {};
            resolve(json);
          }
        } catch (err) {
          reject(err);
        }
      };

      input.oncancel = () => reject(new Error("File selection cancelled"));
      input.click();
    });
  }

  save(name) {
    this._saveAsChroma(name);
  }

  get() {
    return this._project;
  }

  getImageUrl(id) {
    const e = this._images.get(id);
    return e ? e.objectUrl : null;
  }

  getIdByObjectUrl(objectUrl) {
    if (!this._images) return null;
    for (const [id, meta] of this._images.entries()) {
      if (meta && meta.objectUrl === objectUrl) return id;
    }
    return null;
  }

  getTexture(ch) {
    return (this._textures && this._textures[ch]) || null;
  }

  async _loadChroma(file) {
    const ab = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(ab);

    const pjson = await zip.file("project.json").async("string");
    const project = JSON.parse(pjson);
    this._project = project;

    this._images.clear();
    const imgs = (project.Section && project.Section.Images) || [];
    for (const meta of imgs) {
      if (!meta || !meta.path) continue;
      const entry = zip.file(meta.path);
      if (!entry) continue;
      const blob = await entry.async("blob");
      const url = URL.createObjectURL(blob);
      this._images.set(meta.id, { objectUrl: url, blob, mime: meta.mimeType });
    }

    this._textures = {};
    const texMeta = (project.Shaders && project.Shaders.Textures) || {};
    for (const [ch, t] of Object.entries(texMeta)) {
      if (!t || !t.path) {
        this._textures[ch] = null;
        continue;
      }
      const entry = zip.file(t.path);
      if (!entry) {
        this._textures[ch] = null;
        continue;
      }
      const blob = await entry.async("blob");
      const url = URL.createObjectURL(blob);
      const mime = t.mimeType || blob.type || "application/octet-stream";
      this._textures[ch] = { url, mime, path: t.path, blob };
    }
  }

  async _saveAsChroma(name) {
    const zip = new JSZip();

    const project = JSON.parse(JSON.stringify(this._project));

    const section = project.Section || (project.Section = {});
    const md = section.Content || "";
    const mdImgs = this._parseMarkdownImages(md);

    const currentMeta = new Map(
      (section.Images || []).map((m) => [m.id, m]) || []
    );

    const srcMap = {};
    const imagesMeta = [];

    for (const { url } of mdImgs) {
      if (url.startsWith("image:")) {
        const id = url.slice(6);
        const pack = this._images.get(id);
        if (!pack || !pack.blob) continue;

        const meta = currentMeta.get(id);
        const mime =
          pack.mime || (meta && meta.mimeType) || "application/octet-stream";
        const ext = this._extFromMime(mime);
        const path = (meta && meta.path) || `images/${id}.${ext}`;

        zip.file(path, await pack.blob.arrayBuffer());
        imagesMeta.push({ id, path, mimeType: mime });
      } else {
        try {
          const { blob, mime } = await this._fetchAsBlob(url);
          const id = this._uuid4();
          const ext = this._extFromMime(mime);
          const path = `images/${id}.${ext}`;
          zip.file(path, await blob.arrayBuffer());
          srcMap[url] = id;
          imagesMeta.push({ id, path, mimeType: mime });

          const objUrl = URL.createObjectURL(blob);
          this._images.set(id, { objectUrl: objUrl, blob, mime });
        } catch (_) {
          continue;
        }
      }
    }

    if (Object.keys(srcMap).length) {
      section.Content = this._replaceMdSrcWithIds(md, srcMap);
    }
    section.Images = imagesMeta;

    const shaders = project.Shaders || (project.Shaders = {});
    const textures = shaders.Textures || undefined;

    const texturesOut = {};
    if (textures && typeof textures === "object") {
      for (const [ch, t] of Object.entries(textures)) {
        if (!t || !t.src) {
          texturesOut[ch] = null;
          continue;
        }
        try {
          const { blob, mime } = await this._fetchAsBlob(t.src);
          const ext = this._extFromMime(mime);
          const path = `textures/${ch}.${ext}`;
          zip.file(path, await blob.arrayBuffer());
          texturesOut[ch] = { path, mimeType: mime, name: t.name || ch };
        } catch (_) {
          texturesOut[ch] = null;
        }
      }
      project.Shaders.Textures = texturesOut;
    }

    zip.file("project.json", JSON.stringify(project, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = (name && String(name).trim()) || "ChromaProject";

    const safe =
      base.replace(/[\\/:*?"<>|]+/g, "_").replace(/\.+$/, "") ||
      "ChromaProject";
    a.download = safe.endsWith(".chroma") ? safe : safe + ".chroma";
    a.click();
    URL.revokeObjectURL(url);
  }

  _parseMarkdownImages(markdown) {
    const rx = /!\[[^\]]*\]\(([^)]+)\)/g;
    const out = [];
    let m;
    while ((m = rx.exec(markdown)) !== null) out.push({ url: m[1] });
    return out;
  }

  _replaceMdSrcWithIds(markdown, map) {
    return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (all, alt, src) => {
      const id = map[src];
      if (!id) return all;
      return `![${alt}](image:${id})`;
    });
  }

  async _fetchAsBlob(src) {
    if (src.startsWith("blob:")) {
      const id = this.getIdByObjectUrl(src);
      if (id) {
        const pack = this._images.get(id);
        if (pack && pack.blob) {
          return {
            blob: pack.blob,
            mime: pack.mime || "application/octet-stream",
          };
        }
      }
      const res = await fetch(src);
      const blob = await res.blob();
      return { blob, mime: blob.type || "application/octet-stream" };
    } else if (src.startsWith("data:")) {
      const res = await fetch(src);
      const blob = await res.blob();
      return { blob, mime: blob.type || "application/octet-stream" };
    } else {
      const res = await fetch(src, { cache: "no-cache" });
      const blob = await res.blob();
      const mime = blob.type || this._guessMimeFromName(src);
      return { blob, mime };
    }
  }

  _uuid4() {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  _extFromMime(mime) {
    const t = (mime || "").toLowerCase();
    if (t.includes("png")) return "png";
    if (t.includes("jpeg")) return "jpg";
    if (t.includes("jpg")) return "jpg";
    if (t.includes("gif")) return "gif";
    if (t.includes("webp")) return "webp";
    if (t.includes("bmp")) return "bmp";
    if (t.includes("svg")) return "svg";
    return "bin";
  }

  _guessMimeFromName(name) {
    const n = (name || "").toLowerCase();
    if (n.endsWith(".png")) return "image/png";
    if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
    if (n.endsWith(".gif")) return "image/gif";
    if (n.endsWith(".webp")) return "image/webp";
    if (n.endsWith(".bmp")) return "image/bmp";
    if (n.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
  }

  _project;
}

export { Project };
