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

// plugins/minecraft-body/src/index.ts
var index_exports = {};
__export(index_exports, {
  createPlugin: () => createPlugin,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_node_path2 = __toESM(require("node:path"));

// plugins/minecraft-body/src/manager.ts
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_promises = require("node:fs/promises");
var import_node_path = __toESM(require("node:path"));
function validateConnection(value) {
  if (!value || typeof value !== "object") throw new Error("\u8FDE\u63A5\u8BBE\u7F6E\u65E0\u6548");
  const config = value;
  const name = (key, max) => {
    const value2 = config[key];
    if (typeof value2 !== "string" || !value2.trim() || value2.length > max || /[\s\x00-\x1f]/.test(value2)) throw new Error(`${key} \u65E0\u6548`);
    return value2;
  };
  if (!Number.isInteger(config.port) || Number(config.port) < 1 || Number(config.port) > 65535) throw new Error("\u7AEF\u53E3\u5E94\u4E3A 1..65535");
  if (config.auth !== "offline" && config.auth !== "microsoft") throw new Error("\u767B\u5F55\u65B9\u5F0F\u65E0\u6548");
  if (typeof config.version !== "string" || !/^(?:|1\.\d+(?:\.\d+)?)$/.test(config.version)) throw new Error("\u7248\u672C\u5E94\u4E3A\u7A7A\uFF08\u81EA\u52A8\uFF09\u6216 Java \u7248\u7248\u672C\u53F7");
  const username = name("username", config.auth === "offline" ? 16 : 254);
  const owner = name("owner", 16);
  if (!/^[a-zA-Z0-9_]{1,16}$/.test(owner) || config.auth === "offline" && !/^[a-zA-Z0-9_]{1,16}$/.test(username)) throw new Error("\u73A9\u5BB6\u540D\u53EA\u80FD\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u4E0B\u5212\u7EBF");
  if (config.autoSurvival !== void 0 && typeof config.autoSurvival !== "boolean") throw new Error("\u81EA\u52A8\u751F\u5B58\u9009\u9879\u65E0\u6548");
  return { host: name("host", 253), port: Number(config.port), username, owner, auth: config.auth, version: config.version, autoSurvival: config.autoSurvival === true };
}
var BodyManager = class {
  constructor(runtime, dataRoot, spawn = import_node_child_process.fork) {
    this.runtime = runtime;
    this.dataRoot = dataRoot;
    this.spawn = spawn;
  }
  child;
  starting = false;
  stopping;
  closed = false;
  state = { connected: false };
  login;
  results = [];
  notices = [];
  pending = /* @__PURE__ */ new Map();
  status() {
    return {
      running: !!this.child,
      starting: this.starting,
      state: this.state,
      login: this.login,
      results: [...this.results],
      notices: [...this.notices]
    };
  }
  notice(data) {
    this.notices.push({ time: (/* @__PURE__ */ new Date()).toISOString(), data });
    if (this.notices.length > 30) this.notices.shift();
  }
  message(child, message) {
    if (this.child !== child || this.closed || !message || typeof message.type !== "string") return;
    if (message.type === "state") {
      this.state = message.data;
      if (this.state.connected) this.login = void 0;
    } else if (message.type === "login") this.login = message.data;
    else if (message.type === "result" || message.type === "rejected") {
      const result = message.type === "result" ? message.data : { id: message.id, status: "rejected", reason: message.data };
      if (typeof result?.id !== "string") {
        this.notice(message.data);
        return;
      }
      if (result.status !== "active") {
        clearTimeout(this.pending.get(result.id));
        this.pending.delete(result.id);
      }
      const previous = this.results.findIndex((entry) => entry.id === result.id);
      if (previous >= 0) this.results[previous] = result;
      else this.results.push(result);
      if (this.results.length > 50) this.results.shift();
    } else if (message.type === "ended") {
      this.state = { ...this.state, connected: false };
      this.notice(message.data);
    } else this.notice(message.data);
  }
  lost(child, reason) {
    if (this.child !== child) return;
    this.child = void 0;
    this.login = void 0;
    this.state = { ...this.state, connected: false, activeAction: null };
    for (const timer of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
    this.results = this.results.map((result) => ["submitted", "active"].includes(result.status) ? { ...result, status: "disconnected", reason, effectsUncertain: ["collect", "craft", "give", "pickup", "eat", "equip", "equip_armor", "equip_shield", "place", "deposit", "withdraw", "sleep", "wake", "door", "till", "plant", "harvest", "smelt", "defend", "escape"].includes(result.action) } : result);
    this.notice(reason);
  }
  failed(child, reason) {
    if (this.child !== child) return;
    this.state = { ...this.state, connected: false };
    this.notice(reason);
    if (!child.pid) this.lost(child, reason);
    child.kill();
  }
  async start(value) {
    if (this.closed) throw new Error("\u63D2\u4EF6\u5DF2\u505C\u6B62");
    if (this.child || this.starting) throw new Error("\u8EAB\u4F53\u5DF2\u7ECF\u8FD0\u884C\u6216\u6B63\u5728\u542F\u52A8");
    const config = validateConnection(value);
    this.starting = true;
    try {
      await (0, import_promises.mkdir)(this.dataRoot, { recursive: true });
      const root = await (0, import_promises.realpath)(this.dataRoot);
      const profiles = import_node_path.default.join(root, "microsoft-auth");
      await (0, import_promises.mkdir)(profiles, { recursive: true });
      if (import_node_path.default.dirname(await (0, import_promises.realpath)(profiles)) !== root) throw new Error("\u767B\u5F55\u7F13\u5B58\u76EE\u5F55\u4E0D\u80FD\u94FE\u63A5\u5230\u63D2\u4EF6\u6570\u636E\u76EE\u5F55\u5916");
      if (this.closed) throw new Error("\u63D2\u4EF6\u5DF2\u505C\u6B62");
      this.results = [];
      this.login = void 0;
      this.state = { connected: false };
      const options = {
        execArgv: [],
        cwd: this.runtime,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_PATH: "" },
        windowsHide: true
      };
      const child = this.spawn(import_node_path.default.join(this.runtime, "sidecar.cjs"), [], options);
      this.child = child;
      child.on("message", (message) => this.message(child, message));
      child.once("exit", () => this.lost(child, "\u8EAB\u4F53\u8FDB\u7A0B\u5DF2\u9000\u51FA\uFF0C\u52A8\u4F5C\u4E0D\u4F1A\u91CD\u653E"));
      child.once("error", (error) => this.failed(child, error.message));
      child.send({ type: "start", config, profilesFolder: profiles }, (error) => {
        if (error) this.failed(child, error.message);
      });
      return this.status();
    } finally {
      this.starting = false;
    }
  }
  action(value) {
    if (this.closed || !this.child?.connected || !this.state.connected) throw new Error("\u7B49\u5F85\u673A\u5668\u4EBA\u51FA\u751F\u540E\u518D\u6267\u884C\u52A8\u4F5C");
    const input = value;
    const id = (0, import_node_crypto.randomUUID)();
    const request = { id, action: input?.action, material: input?.material, count: input?.count, timeoutMs: input?.timeoutMs, position: input?.position, open: input?.open };
    const { validateAction } = require(import_node_path.default.join(this.runtime, "body.cjs"));
    validateAction(request);
    if (this.state.activeAction || this.pending.size) throw new Error("\u5DF2\u6709\u52A8\u4F5C\u8FD0\u884C\uFF0C\u8BF7\u5148\u505C\u6B62");
    const child = this.child;
    const result = { id, action: request.action, status: "submitted" };
    this.results.push(result);
    if (this.results.length > 50) this.results.shift();
    this.pending.set(id, setTimeout(() => {
      this.notice("\u8EAB\u4F53\u672A\u5728\u622A\u6B62\u65F6\u95F4\u8FD4\u56DE\u7ED3\u679C\uFF1B\u5173\u95ED\u8EAB\u4F53\uFF0C\u4E0D\u81EA\u52A8\u91CD\u8BD5");
      void this.stop().catch((error) => this.notice(error.message));
    }, Number(request.timeoutMs ?? 6e4) + 5e3));
    child.send({ type: "action", request }, (error) => {
      if (error) this.failed(child, error.message);
    });
    return result;
  }
  cancel() {
    if (!this.closed && this.child?.connected) this.child.send({ type: "cancel" }, (error) => {
      if (error) this.notice(error.message);
    });
    return { requested: true };
  }
  async stop() {
    if (this.stopping) return this.stopping;
    const child = this.child;
    if (!child) return;
    this.stopping = new Promise((resolve, reject) => {
      let failureTimer;
      const force = () => {
        failureTimer ??= setTimeout(() => {
          this.state = { ...this.state, connected: false };
          reject(new Error("\u8EAB\u4F53\u8FDB\u7A0B\u5C1A\u672A\u786E\u8BA4\u9000\u51FA\uFF1B\u4FDD\u7559\u53E5\u67C4\uFF0C\u7981\u6B62\u518D\u6B21\u8FDE\u63A5"));
        }, 2e3);
        child.kill();
      };
      const timer = setTimeout(force, 2e3);
      child.once("exit", () => {
        clearTimeout(timer);
        clearTimeout(failureTimer);
        resolve();
      });
      if (child.connected) child.send({ type: "stop" }, (error) => {
        if (error) force();
      });
      else force();
    });
    try {
      await this.stopping;
      this.lost(child, "\u8EAB\u4F53\u5DF2\u65AD\u5F00\uFF0C\u52A8\u4F5C\u4E0D\u4F1A\u91CD\u653E");
    } finally {
      this.stopping = void 0;
    }
  }
  async close() {
    this.closed = true;
    await this.stop();
  }
};

// plugins/minecraft-body/src/index.ts
var createPlugin = (createManager = (runtime, data) => new BodyManager(runtime, data)) => ({
  register(ctx) {
    const manager = createManager(import_node_path2.default.join(__dirname, "runtime"), ctx.storage.rootDir());
    ctx.onDispose(() => manager.close());
    const accepting = (action) => {
      ctx.signal.throwIfAborted();
      return action();
    };
    ctx.registerIpc("body-status", () => accepting(() => manager.status()));
    ctx.registerIpc("body-start", (config) => accepting(() => manager.start(config)));
    ctx.registerIpc("body-action", (request) => accepting(() => manager.action(request)));
    ctx.registerIpc("body-cancel", () => accepting(() => manager.cancel()));
    ctx.registerIpc("body-stop", () => manager.stop());
  }
});
var index_default = createPlugin();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPlugin
});
