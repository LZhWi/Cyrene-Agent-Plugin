"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/furina-file-tools/src/index.ts
var index_exports = {};
__export(index_exports, {
  MODES: () => MODES,
  TOOL_IDS: () => TOOL_IDS,
  createPlugin: () => createPlugin,
  default: () => index_default,
  requireMode: () => requireMode
});
module.exports = __toCommonJS(index_exports);
var import_node_crypto3 = require("node:crypto");
var import_promises2 = require("node:fs/promises");
var import_node_path4 = __toESM(require("node:path"));

// plugins/furina-file-tools/src/client.ts
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"));
function validateConfig(value) {
  const config = value;
  if (!config || typeof config.sourceRoot !== "string" || typeof config.python !== "string" || !import_node_path.default.isAbsolute(config.sourceRoot) || !import_node_path.default.isAbsolute(config.python)) {
    throw new Error("\u8BF7\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5199 FurinaKit \u6E90\u7801\u76EE\u5F55\u548C Python \u53EF\u6267\u884C\u6587\u4EF6\u7684\u7EDD\u5BF9\u8DEF\u5F84");
  }
  if (!(0, import_node_fs.existsSync)(import_node_path.default.join(config.sourceRoot, "cyrene-api", "server.py")) || !(0, import_node_fs.existsSync)(config.python)) {
    throw new Error("\u627E\u4E0D\u5230 FurinaKit API \u6E90\u7801\u6216 Python \u53EF\u6267\u884C\u6587\u4EF6");
  }
  return { sourceRoot: import_node_path.default.resolve(config.sourceRoot), python: import_node_path.default.resolve(config.python) };
}
var LocalApi = class {
  constructor(config, stateDir) {
    this.config = config;
    this.stateDir = stateDir;
  }
  process;
  startup;
  token = (0, import_node_crypto.randomBytes)(32).toString("hex");
  stopped = false;
  start() {
    if (this.stopped) return Promise.reject(new Error("FurinaKit \u670D\u52A1\u5DF2\u505C\u6B62"));
    if (this.startup) return this.startup;
    this.startup = new Promise((resolve, reject) => {
      const child = (0, import_node_child_process.spawn)(this.config.python, [
        "-u",
        import_node_path.default.join(this.config.sourceRoot, "cyrene-api", "server.py"),
        "--state-dir",
        this.stateDir,
        "--managed"
      ], {
        cwd: this.config.sourceRoot,
        env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", FURINAKIT_API_TOKEN: this.token },
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
      this.process = child;
      let buffer = "";
      let errorOutput = "";
      let ready = false;
      const timeout = setTimeout(() => {
        child.stdin.end();
        child.kill();
        reject(new Error("FurinaKit API \u542F\u52A8\u8D85\u65F6"));
      }, 15e3);
      child.stderr.on("data", (data) => {
        errorOutput = (errorOutput + data.toString()).slice(-4096);
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("exit", () => {
        clearTimeout(timeout);
        this.process = void 0;
        this.startup = void 0;
        if (!ready) reject(new Error(`FurinaKit API \u542F\u52A8\u5931\u8D25\uFF0C\u8BF7\u8FD0\u884C cyrene-api/setup.ps1\u3002${errorOutput}`));
      });
      child.stdout.on("data", (data) => {
        if (ready) return;
        buffer += data.toString("utf8");
        if (buffer.length > 8192) {
          child.kill();
          reject(new Error("FurinaKit API \u542F\u52A8\u54CD\u5E94\u65E0\u6548"));
          return;
        }
        const end = buffer.indexOf("\n");
        if (end < 0) return;
        try {
          const info = JSON.parse(buffer.slice(0, end));
          if (info.service !== "furinakit-cyrene-api" || info.protocol !== 1 || info.pid !== child.pid || !Number.isInteger(info.port) || info.port < 1 || info.port > 65535) throw new Error("API \u542F\u52A8\u54CD\u5E94\u4E0D\u5339\u914D");
          ready = true;
          clearTimeout(timeout);
          resolve(`http://127.0.0.1:${info.port}`);
        } catch (error) {
          clearTimeout(timeout);
          child.kill();
          reject(error);
        }
      });
    });
    return this.startup;
  }
  async request(route, body, signal) {
    signal?.throwIfAborted();
    const endpoint = await this.start();
    signal?.throwIfAborted();
    const response = await fetch(endpoint + route, {
      method: body === void 0 ? "GET" : "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: body === void 0 ? void 0 : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(1e4)]) : AbortSignal.timeout(1e4),
      redirect: "error"
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `FurinaKit API: HTTP ${response.status}`);
    return value;
  }
  async close() {
    this.stopped = true;
    const child = this.process;
    if (!child || child.exitCode !== null) return;
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.kill();
        resolve();
      }, 3e3);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      child.stdin.end();
    });
  }
};

// plugins/furina-file-tools/src/manual.ts
var import_node_crypto2 = require("node:crypto");
var import_promises = require("node:fs/promises");
var import_node_path2 = __toESM(require("node:path"));
var FILE_TOOLS = ["image-compress", "image-resize", "image-convert", "pdf-merge", "pdf-split", "html-to-pdf", "html-to-image"];
var terminal = (job) => !job || ["completed", "failed", "cancelled"].includes(job.status);
function createManualController(deps) {
  let root = "";
  let inputs = [];
  let job;
  let submitting = false;
  let modelAbort;
  const model = { running: false, text: "", error: "", event: "" };
  const assertIdle = () => {
    deps.context.signal.throwIfAborted();
    if (submitting || model.running || !terminal(job)) throw new Error("\u8BF7\u7B49\u5F85\u5F53\u524D\u4EFB\u52A1\u7ED3\u675F\u6216\u5148\u53D6\u6D88\u4EFB\u52A1");
  };
  const refresh = async () => {
    if (job && !terminal(job)) job = await deps.api().request("/jobs/get", { id: job.id, workspace: job.workspace }, deps.context.signal);
  };
  const state = () => ({
    workspace: root,
    inputs: [...inputs],
    job,
    model: { ...model },
    modelAvailable: typeof deps.context.deps.llm?.runGoal === "function"
  });
  const selection = async (value) => {
    const request = value;
    if (!request || typeof request.tool !== "string" || !FILE_TOOLS.includes(request.tool)) throw new Error("\u8BF7\u9009\u62E9\u652F\u6301\u7684\u5DE5\u5177");
    if (!root || inputs.length === 0) throw new Error("\u8BF7\u5148\u9009\u62E9\u5DE5\u4F5C\u533A\u548C\u6587\u4EF6");
    if (request.tool === "pdf-merge" ? inputs.length < 2 || inputs.length > 32 : inputs.length !== 1) throw new Error("PDF\u5408\u5E76\u97002\u523032\u4E2A\u6587\u4EF6\uFF0C\u5176\u4F59\u5DE5\u5177\u97001\u4E2A\u6587\u4EF6");
    for (const input of inputs) {
      const file = await (0, import_promises.realpath)(input);
      const relative = import_node_path2.default.relative(root, file);
      if (relative === ".." || relative.startsWith(`..${import_node_path2.default.sep}`) || import_node_path2.default.isAbsolute(relative) || !(await (0, import_promises.stat)(file)).isFile()) throw new Error("\u6587\u4EF6\u5FC5\u987B\u4F4D\u4E8E\u6240\u9009\u5DE5\u4F5C\u533A\u5185");
      const extensions = request.tool.startsWith("pdf-") ? [".pdf"] : request.tool.startsWith("html-") ? [".html", ".htm"] : [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".gif", ".ico"];
      if (!extensions.includes(import_node_path2.default.extname(file).toLowerCase())) throw new Error("\u6587\u4EF6\u683C\u5F0F\u4E0E\u6240\u9009\u5DE5\u5177\u4E0D\u5339\u914D");
    }
    const params = request.parameters ?? {};
    if (typeof params !== "object" || params === null || Array.isArray(params)) throw new Error("\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61");
    const allowed = {
      "image-compress": ["quality", "max_width"],
      "image-resize": ["width", "height", "keep_ratio"],
      "image-convert": ["format"],
      "pdf-merge": [],
      "pdf-split": ["ranges"],
      "html-to-pdf": ["method", "landscape", "wait_ms"],
      "html-to-image": ["method", "width", "height", "wait_ms"]
    };
    const parameters = structuredClone(params);
    if (Object.keys(parameters).some((key) => !allowed[request.tool].includes(key))) throw new Error("\u5DE5\u5177\u53C2\u6570\u4E0D\u5339\u914D");
    for (const key of ["quality", "width", "height", "max_width"]) {
      if (key in parameters && (!Number.isInteger(parameters[key]) || parameters[key] < 1 || parameters[key] > (key === "quality" ? 95 : 16384))) throw new Error(`${key} \u53C2\u6570\u8D85\u51FA\u8303\u56F4`);
    }
    if ("keep_ratio" in parameters && typeof parameters.keep_ratio !== "boolean") throw new Error("\u4FDD\u6301\u6BD4\u4F8B\u53C2\u6570\u65E0\u6548");
    if (request.tool === "image-resize" && !("width" in parameters) && !("height" in parameters)) throw new Error("\u8BF7\u586B\u5199\u5BBD\u5EA6\u6216\u9AD8\u5EA6");
    if (request.tool === "image-convert" && !["png", "jpg", "webp", "bmp", "tiff"].includes(String(parameters.format))) throw new Error("\u8BF7\u9009\u62E9\u8F93\u51FA\u683C\u5F0F");
    if (request.tool === "pdf-split" && (typeof parameters.ranges !== "string" || parameters.ranges.length > 1024 || !/^[1-9]\d*(?:-[1-9]\d*)?(?:,[1-9]\d*(?:-[1-9]\d*)?)*$/.test(parameters.ranges))) throw new Error("\u9875\u7801\u683C\u5F0F\u5E94\u4E3A1-3,5\uFF0C\u9875\u7801\u4ECE1\u5F00\u59CB");
    if (request.tool.startsWith("html-")) {
      if (!["render", "extract"].includes(String(parameters.method ?? "render"))) throw new Error("\u8BF7\u9009\u62E9\u7F51\u9875\u6392\u7248\u6216\u539F\u56FE\u63D0\u53D6\u65B9\u5F0F");
      if ("landscape" in parameters && typeof parameters.landscape !== "boolean") throw new Error("\u6A2A\u5411\u53C2\u6570\u65E0\u6548");
      if ("wait_ms" in parameters && (!Number.isInteger(parameters.wait_ms) || parameters.wait_ms < 0 || parameters.wait_ms > 3e4)) throw new Error("\u7B49\u5F85\u65F6\u95F4\u5E94\u4E3A0\u523030000\u6BEB\u79D2");
      if (parameters.method === "extract" && Object.keys(parameters).some((key) => key !== "method")) throw new Error("\u539F\u56FE\u63D0\u53D6\u65E0\u9700\u7F51\u9875\u6E32\u67D3\u53C2\u6570");
    }
    return { request_id: (0, import_node_crypto2.randomUUID)(), workspace: root, tool: request.tool, inputs: [...inputs], parameters };
  };
  const submit = async (request, signal) => {
    signal.throwIfAborted();
    const api = deps.api();
    try {
      job = await api.request("/jobs", request, signal);
      return job;
    } catch (error) {
      await api.request("/jobs/cancel", { id: request.request_id, workspace: request.workspace }).catch(() => void 0);
      throw error;
    }
  };
  const cancel = async () => {
    modelAbort?.abort();
    if (job && !terminal(job)) job = await deps.api().request("/jobs/cancel", { id: job.id, workspace: job.workspace }, deps.context.signal);
  };
  return {
    stop() {
      modelAbort?.abort();
    },
    async handle(action, data) {
      deps.context.signal.throwIfAborted();
      if (action === "state") {
        await refresh();
        return state();
      }
      if (action === "choose-workspace") {
        assertIdle();
        const selected = await deps.pickWorkspace();
        deps.context.signal.throwIfAborted();
        if (selected) {
          const directory = await (0, import_promises.realpath)(selected);
          if (!(await (0, import_promises.stat)(directory)).isDirectory()) throw new Error("\u5DE5\u4F5C\u533A\u4E0D\u662F\u76EE\u5F55");
          root = directory;
          inputs = [];
        }
        return state();
      }
      if (action === "choose-files") {
        assertIdle();
        if (!root) throw new Error("\u8BF7\u5148\u9009\u62E9\u5DE5\u4F5C\u533A");
        if (typeof data !== "string" || !FILE_TOOLS.includes(data)) throw new Error("\u5DE5\u5177\u65E0\u6548");
        const selected = await deps.pickFiles(root, data.startsWith("pdf-") ? "pdf" : data.startsWith("html-") ? "html" : "image", data === "pdf-merge");
        deps.context.signal.throwIfAborted();
        if (selected) {
          const files = await Promise.all(selected.map((file) => (0, import_promises.realpath)(file)));
          for (const file of files) {
            const relative = import_node_path2.default.relative(root, file);
            if (relative === ".." || relative.startsWith(`..${import_node_path2.default.sep}`) || import_node_path2.default.isAbsolute(relative)) throw new Error("\u8BF7\u9009\u62E9\u5DE5\u4F5C\u533A\u5185\u7684\u6587\u4EF6");
          }
          inputs = files;
        }
        return state();
      }
      if (action === "move-file") {
        assertIdle();
        const move = data;
        if (!move || !Number.isInteger(move.index) || ![-1, 1].includes(move.direction) || !inputs[move.index] || !inputs[move.index + move.direction]) throw new Error("\u6587\u4EF6\u987A\u5E8F\u65E0\u6548");
        const target = move.index + move.direction;
        [inputs[move.index], inputs[target]] = [inputs[target], inputs[move.index]];
        return state();
      }
      if (action === "cancel") {
        await cancel();
        return state();
      }
      if (action === "show-file") {
        await refresh();
        if (job?.status !== "completed" || typeof data !== "string" || !job.artifacts.some((artifact) => artifact.path === data)) throw new Error("\u53EA\u80FD\u5B9A\u4F4D\u5F53\u524D\u5DF2\u5B8C\u6210\u4EFB\u52A1\u7684\u4EA7\u7269");
        deps.showFile(data);
        return state();
      }
      if (action === "submit" || action === "model-start") {
        assertIdle();
        submitting = true;
        try {
          const request = await selection(data);
          if (action === "submit") {
            model.text = "";
            model.error = "";
            model.event = "";
            await submit(request, deps.context.signal);
          } else {
            const runGoal = deps.context.deps.llm?.runGoal;
            if (!runGoal) throw new Error("\u5F53\u524D\u5BBF\u4E3B\u4E0D\u652F\u6301\u6A21\u578B\u4EFB\u52A1\uFF0C\u8BF7\u66F4\u65B0\u5BBF\u4E3B\u6216\u4F7F\u7528\u76F4\u63A5\u6267\u884C");
            job = void 0;
            modelAbort = new AbortController();
            const signal = AbortSignal.any([deps.context.signal, modelAbort.signal]);
            Object.assign(model, { running: true, text: "", error: "", event: "\u6B63\u5728\u4EA4\u7ED9\u6A21\u578B" });
            let submitted;
            const selectedTool = {
              id: "furina-file-tools_selected",
              name: "\u6267\u884C\u7528\u6237\u5DF2\u6307\u5B9A\u7684\u6587\u4EF6\u64CD\u4F5C",
              description: `\u6267\u884C\u7528\u6237\u5DF2\u786E\u8BA4\u7684 ${request.tool}\u3002\u6587\u4EF6\u548C\u53C2\u6570\u5DF2\u56FA\u5B9A\uFF0C\u65E0\u9700\u586B\u5199\u53C2\u6570\uFF1B\u91CD\u590D\u8C03\u7528\u53EA\u8FD4\u56DE\u540C\u4E00\u4E2A\u4EFB\u52A1\u3002`,
              enabled: true,
              modes: ["work"],
              risk: "fs-write",
              effectKind: "mutation",
              verificationPolicy: "artifact",
              inputSchema: { type: "object", properties: {}, required: [] },
              async execute() {
                return JSON.stringify(await (submitted ??= submit(request, signal)));
              }
            };
            const selectedStatus = {
              id: "furina-file-tools_selected_status",
              name: "\u67E5\u8BE2\u5DF2\u6307\u5B9A\u64CD\u4F5C\u7684\u7ED3\u679C",
              description: "\u67E5\u8BE2\u521A\u521A\u63D0\u4EA4\u7684\u540C\u4E00\u4E2A\u6587\u4EF6\u4EFB\u52A1\uFF0C\u53D6\u5F97\u4EA7\u7269\u8DEF\u5F84\u6216\u5931\u8D25\u539F\u56E0\u3002",
              enabled: true,
              modes: ["work"],
              risk: "safe",
              effectKind: "read",
              verificationPolicy: "none",
              inputSchema: { type: "object", properties: {}, required: [] },
              async execute() {
                signal.throwIfAborted();
                if (!submitted) throw new Error("\u8BF7\u5148\u6267\u884C\u5DF2\u6307\u5B9A\u7684\u6587\u4EF6\u64CD\u4F5C");
                await submitted;
                await refresh();
                return JSON.stringify(job);
              }
            };
            const finish = (result) => {
              model.text = result.text;
              if (!submitted) model.error = "\u6A21\u578B\u672A\u8C03\u7528\u5DF2\u6307\u5B9A\u5DE5\u5177\uFF0C\u672A\u5904\u7406\u6587\u4EF6";
              else if (result.terminal.status !== "success") model.error = result.terminal.reason || `\u6A21\u578B\u4EFB\u52A1\u72B6\u6001\uFF1A${result.terminal.status}`;
            };
            void Promise.resolve().then(() => runGoal({
              runId: (0, import_node_crypto2.randomUUID)(),
              purpose: "furina-manual-selected",
              signal,
              maxRounds: 12,
              maxWallMs: 3e5,
              goal: `\u7528\u6237\u5DF2\u624B\u52A8\u6307\u5B9A\u6587\u4EF6\u5904\u7406\u64CD\u4F5C\uFF0C\u8BF7\u8C03\u7528 furina-file-tools_selected\uFF0C\u518D\u67E5\u8BE2\u7ED3\u679C\u5E76\u8BF4\u660E\u4EA7\u7269\u8DEF\u5F84\u3002\u4E0D\u5F97\u66FF\u6362\u64CD\u4F5C\u6216\u53EA\u7ED9\u6559\u7A0B\u3002\u9009\u62E9\u4FE1\u606F\uFF1A${JSON.stringify(request)}`,
              tools: [selectedTool, selectedStatus],
              onEvent(event) {
                model.event = event.kind === "round_started" ? `\u6A21\u578B\u6B63\u5728\u5904\u7406\uFF08\u7B2C${event.round}\u8F6E\uFF09` : `${event.kind === "tool_started" ? "\u6B63\u5728\u8C03\u7528" : "\u5DF2\u8C03\u7528"}\uFF1A${event.toolName}`;
              }
            })).then(finish).catch((error) => {
              model.error = error instanceof Error ? error.message : "\u6A21\u578B\u4EFB\u52A1\u5931\u8D25";
            }).finally(() => {
              model.running = false;
              modelAbort = void 0;
            });
          }
          return state();
        } finally {
          submitting = false;
        }
      }
      throw new Error("\u64CD\u4F5C\u672A\u6388\u6743");
    }
  };
}

// plugins/furina-file-tools/src/panel.ts
var import_node_path3 = __toESM(require("node:path"));
function createPanel(ctx, directory) {
  let window;
  ctx.onDispose(() => {
    window?.destroy();
    window = void 0;
  });
  return {
    async open() {
      ctx.signal.throwIfAborted();
      if (window && !window.isDestroyed()) {
        window.show();
        window.focus();
        return;
      }
      const { BrowserWindow } = require("electron");
      window = new BrowserWindow({
        title: "Furina \u6587\u4EF6\u5DE5\u5177",
        width: 880,
        height: 820,
        minWidth: 640,
        minHeight: 580,
        autoHideMenuBar: true,
        webPreferences: { preload: import_node_path3.default.join(directory, "preload.cjs"), nodeIntegration: false, contextIsolation: true, sandbox: true, partition: `furina-${ctx.id}` }
      });
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (event) => event.preventDefault());
      window.on("closed", () => {
        window = void 0;
      });
      await window.loadFile(import_node_path3.default.join(directory, "ui.html"));
    },
    async pickWorkspace() {
      const { dialog } = require("electron");
      const options = { title: "\u9009\u62E9\u6587\u4EF6\u5904\u7406\u5DE5\u4F5C\u533A", properties: ["openDirectory"] };
      const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
      return result.canceled ? void 0 : result.filePaths[0];
    },
    async pickFiles(root, kind, multiple) {
      const { dialog } = require("electron");
      const options = {
        title: "\u9009\u62E9\u5DE5\u4F5C\u533A\u5185\u7684\u6587\u4EF6",
        defaultPath: root,
        properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
        filters: [{ name: kind === "pdf" ? "PDF" : kind === "html" ? "HTML" : "\u56FE\u7247", extensions: kind === "pdf" ? ["pdf"] : kind === "html" ? ["html", "htm"] : ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "gif", "ico"] }]
      };
      const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
      return result.canceled ? void 0 : result.filePaths;
    },
    showFile(file) {
      const { shell } = require("electron");
      shell.showItemInFolder(file);
    }
  };
}

// plugins/furina-file-tools/src/index.ts
var MODES = ["work", "code", "learn"];
var TOOL_IDS = FILE_TOOLS;
function requireMode(context) {
  if (!context?.mode || !MODES.includes(context.mode)) {
    throw new Error("Furina \u6587\u4EF6\u5DE5\u5177\u4EC5\u652F\u6301 work/code/learn \u6A21\u5F0F");
  }
}
async function workspace(context) {
  requireMode(context);
  if (!context?.resolvedWorkspaceRoot) throw new Error("\u8BF7\u5148\u4E3A\u5F53\u524D\u4F1A\u8BDD\u9009\u62E9\u5DE5\u4F5C\u533A");
  const root = await (0, import_promises2.realpath)(context.resolvedWorkspaceRoot);
  if (!(await (0, import_promises2.stat)(root)).isDirectory()) throw new Error("\u5DE5\u4F5C\u533A\u4E0D\u662F\u76EE\u5F55");
  return root;
}
var createPlugin = () => {
  let openPanel;
  return {
    async open() {
      if (!openPanel) throw new Error("\u8BF7\u5148\u542F\u7528 Furina \u6587\u4EF6\u5DE5\u5177\u63D2\u4EF6");
      await openPanel();
    },
    register(ctx) {
      let api;
      const getApi = () => {
        ctx.signal.throwIfAborted();
        return api ??= new LocalApi(validateConfig(ctx.storage.get("connection")), import_node_path4.default.join(ctx.storage.rootDir(), "api-jobs"));
      };
      ctx.onDispose(async () => {
        await api?.close();
      });
      const panel = createPanel(ctx, __dirname);
      openPanel = () => panel.open();
      const manual = createManualController({
        context: ctx,
        api: getApi,
        pickWorkspace: () => panel.pickWorkspace(),
        pickFiles: (root, kind, multiple) => panel.pickFiles(root, kind, multiple),
        showFile: (file) => panel.showFile(file)
      });
      ctx.onDispose(() => {
        manual.stop();
        openPanel = void 0;
      });
      ctx.registerIpc("open-panel", () => panel.open());
      ctx.registerIpc("ui", async (action, data) => {
        try {
          if (typeof action !== "string") throw new Error("\u64CD\u4F5C\u65E0\u6548");
          return { ok: true, data: await manual.handle(action, data) };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : "\u64CD\u4F5C\u5931\u8D25" };
        }
      });
      ctx.registerIpc("connection-get", () => ctx.storage.get("connection") ?? { sourceRoot: "", python: "" });
      ctx.registerIpc("connection-save", async (value) => {
        ctx.signal.throwIfAborted();
        const config = validateConfig(value);
        await api?.close();
        api = void 0;
        ctx.storage.set("connection", config);
        return { ok: true };
      });
      const register = (definition) => {
        const execute = definition.execute;
        ctx.registerTool({
          ...definition,
          enabled: true,
          modes: [...MODES],
          needsContext: true,
          async execute(args, context) {
            requireMode(context);
            ctx.signal.throwIfAborted();
            context?.signal?.throwIfAborted();
            return execute(args, context);
          }
        });
      };
      const signal = (context) => context?.signal ? AbortSignal.any([ctx.signal, context.signal]) : ctx.signal;
      register({
        id: "furina-file-tools_catalog",
        name: "\u67E5\u770B Furina \u6587\u4EF6\u5DE5\u5177",
        description: "\u67E5\u770B\u672C\u673A FurinaKit API \u72B6\u6001\u53CA\u56FE\u7247/PDF/HTML \u5DE5\u5177\u7684\u53C2\u6570\u3002\u53EA\u7528\u4E8E work/code/learn\u3002",
        risk: "safe",
        effectKind: "read",
        verificationPolicy: "none",
        inputSchema: { type: "object", properties: {}, required: [] },
        async execute(_args, context) {
          const service = await getApi().request("/health", void 0, signal(context));
          const catalog = await getApi().request("/tools", void 0, signal(context));
          return JSON.stringify({ service, catalog });
        }
      });
      register({
        id: "furina-file-tools_submit",
        name: "\u5904\u7406\u672C\u5730\u56FE\u7247\u3001PDF \u6216 HTML",
        description: "\u8C03\u7528 FurinaKit \u5904\u7406\u5DE5\u4F5C\u533A\u5185\u6587\u4EF6\uFF0C\u8FD4\u56DE\u4EFB\u52A1ID\uFF1B\u7528 status \u67E5\u8BE2\u4EA7\u7269\u3002\u56FE\u7247\u538B\u7F29\u8F93\u51FA\u767D\u5E95JPEG\uFF1B\u7F29\u653E\u4F20width\u6216height\uFF1B\u8F6C\u6362\u4F20format\uFF1BPDF\u5408\u5E76\u81F3\u5C11\u4E24\u4E2A\u6587\u4EF6\uFF1B\u62C6\u5206\u4F20ranges\u3002html-to-pdf/html-to-image\u652F\u6301method=render\uFF08\u9ED8\u8BA4\uFF0C\u9759\u6001\u7F51\u9875\u6392\u7248\u5BFC\u51FAPDF/PNG\uFF09\u6216extract\uFF08\u63D0\u53D6img\u539F\u56FE\uFF0C\u5408\u6210PDF\u6216\u4FDD\u7559\u539F\u56FE\u7247\uFF09\uFF1B\u4EC5\u52A0\u8F7D\u5185\u5D4C\u53CA\u5DE5\u4F5C\u533A\u672C\u5730\u8D44\u6E90\u3002\u4EA7\u7269\u5199\u5165 .furinakit-output/\u4EFB\u52A1ID/\u3002",
        risk: "fs-write",
        effectKind: "mutation",
        verificationPolicy: "artifact",
        inputSchema: { type: "object", properties: {
          tool: { type: "string", enum: TOOL_IDS },
          inputs: { type: "array", items: { type: "string" }, description: "\u5F53\u524D\u5DE5\u4F5C\u533A\u5185\u7684\u6587\u4EF6\u8DEF\u5F84\uFF0CHTML\u5DE5\u5177\u4F20\u4E00\u4E2A.html/.htm\u6587\u4EF6\uFF1B\u987A\u5E8F\u7528\u4E8EPDF\u5408\u5E76" },
          parameters: { type: "object", properties: {
            quality: { type: "integer", description: "JPEG\u8D28\u91CF1..95\uFF0C\u9ED8\u8BA475" },
            max_width: { type: "integer", description: "\u538B\u7F29\u65F6\u6700\u5927\u5BBD\u5EA61..16384" },
            width: { type: "integer", description: "\u7F29\u653E\u5BBD\u5EA61..16384" },
            height: { type: "integer", description: "\u7F29\u653E\u9AD8\u5EA61..16384" },
            keep_ratio: { type: "boolean", description: "\u4FDD\u6301\u6BD4\u4F8B\uFF0C\u9ED8\u8BA4true" },
            format: { type: "string", enum: ["png", "jpg", "webp", "bmp", "tiff"] },
            ranges: { type: "string", description: "PDF\u9875\u7801\u4ECE1\u5F00\u59CB\uFF0C\u4F8B\u59821-3,5" },
            method: { type: "string", enum: ["render", "extract"], description: "HTML\u5BFC\u51FA\u65B9\u5F0F\uFF0C\u9ED8\u8BA4render\uFF1Bextract\u65F6\u4EC5\u4F20method" },
            landscape: { type: "boolean", description: "HTML\u6309\u7F51\u9875\u6392\u7248\u5BFC\u51FAPDF\u65F6\u6A2A\u5411\uFF0C\u9ED8\u8BA4false" },
            wait_ms: { type: "integer", description: "HTML\u7F51\u9875\u6E32\u67D3\u7B49\u5F850..30000\u6BEB\u79D2\uFF0C\u9ED8\u8BA41500" }
          } }
        }, required: ["tool", "inputs"] },
        async execute(args, context) {
          const root = await workspace(context);
          const id = (0, import_node_crypto3.randomUUID)();
          const requestSignal = signal(context);
          const connection = getApi();
          try {
            return JSON.stringify(await connection.request("/jobs", {
              request_id: id,
              workspace: root,
              tool: args.tool,
              inputs: args.inputs,
              parameters: args.parameters ?? {}
            }, requestSignal));
          } catch (error) {
            await connection.request("/jobs/cancel", { id, workspace: root }).catch(() => void 0);
            throw error;
          }
        }
      });
      for (const action of ["status", "cancel"]) {
        register({
          id: `furina-file-tools_${action}`,
          name: action === "status" ? "\u67E5\u8BE2 Furina \u4EFB\u52A1" : "\u53D6\u6D88 Furina \u4EFB\u52A1",
          description: action === "status" ? "\u67E5\u8BE2\u5F53\u524D\u5DE5\u4F5C\u533A\u7684 Furina \u6587\u4EF6\u4EFB\u52A1\u72B6\u6001\u3001\u5931\u8D25\u539F\u56E0\u548C\u751F\u6210\u6587\u4EF6\u8DEF\u5F84\u3002" : "\u53D6\u6D88\u5F53\u524D\u5DE5\u4F5C\u533A\u7684 Furina \u6587\u4EF6\u5904\u7406\u4EFB\u52A1\u3002",
          risk: action === "status" ? "safe" : "fs-write",
          effectKind: action === "status" ? "read" : "mutation",
          verificationPolicy: "none",
          inputSchema: { type: "object", properties: { id: { type: "string", description: "submit\u8FD4\u56DE\u7684\u4EFB\u52A1ID" } }, required: ["id"] },
          async execute(args, context) {
            const root = await workspace(context);
            if (typeof args.id !== "string") throw new Error("id\u5FC5\u987B\u662F\u4EFB\u52A1ID");
            const job = await getApi().request(action === "status" ? "/jobs/get" : "/jobs/cancel", { id: args.id, workspace: root }, signal(context));
            return JSON.stringify(job);
          }
        });
      }
    }
  };
};
var plugin = createPlugin();
var index_default = plugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MODES,
  TOOL_IDS,
  createPlugin,
  requireMode
});
