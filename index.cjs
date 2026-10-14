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

// plugins/dungeons-input/src/index.ts
var index_exports = {};
__export(index_exports, {
  createPlugin: () => createPlugin,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_node_path2 = __toESM(require("node:path"));

// plugins/dungeons-input/src/manager.ts
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_path = __toESM(require("node:path"));
var controls = ["up", "down", "left", "right", "A", "B", "X", "Y", "LB", "RB", "Start", "Back", "LeftThumb", "RightThumb", "DpadUp", "DpadDown", "DpadLeft", "DpadRight", "RT"];
function validatePulse(value) {
  const input = value;
  if (!input || input.pad !== 1 && input.pad !== 2) throw new Error("\u624B\u67C4\u5E94\u4E3A 1 \u6216 2");
  if (typeof input.control !== "string" || !controls.includes(input.control)) throw new Error("\u672A\u77E5\u6D4B\u8BD5\u6309\u952E");
  if (!Number.isInteger(input.durationMs) || Number(input.durationMs) < 50 || Number(input.durationMs) > 1e3) throw new Error("\u8109\u51B2\u5E94\u4E3A 50..1000 \u6BEB\u79D2");
  if (!Number.isInteger(input.delayMs) || Number(input.delayMs) < 2e3 || Number(input.delayMs) > 1e4) throw new Error("\u5EF6\u8FDF\u5E94\u4E3A 2000..10000 \u6BEB\u79D2");
  if (input.pad === 1 && input.confirmP1 !== true) throw new Error("\u7B2C\u4E00\u53EA\u624B\u67C4\u4EC5\u7528\u4E8E\u624B\u52A8\u521D\u59CB\u5316\uFF0C\u9700\u8981\u660E\u786E\u786E\u8BA4");
  return { pad: input.pad, control: input.control, durationMs: Number(input.durationMs), delayMs: Number(input.delayMs), confirmP1: input.confirmP1 === true };
}
function validateFollow(value, observeOnly) {
  const input = value;
  if (!input || !Number.isInteger(input.delayMs) || Number(input.delayMs) < 2e3 || Number(input.delayMs) > 1e4) throw new Error("\u5EF6\u8FDF\u5E94\u4E3A 2000..10000 \u6BEB\u79D2");
  if (!observeOnly && input.confirmCamp !== true) throw new Error("\u5148\u786E\u8BA4\u8425\u5730\u7A7A\u5730\u3001\u7B2C\u4E8C\u53EA\u63A7\u5236 P2\uFF0C\u5E76\u5728\u6821\u51C6\u65F6\u4FDD\u6301 P1 \u9759\u6B62");
  return { delayMs: Number(input.delayMs), confirmCamp: input.confirmCamp === true };
}
var InputManager = class {
  constructor(runtime, launch = import_node_child_process.spawn) {
    this.runtime = runtime;
    this.launch = launch;
  }
  child;
  heartbeat;
  shutdown;
  closed = false;
  state = { ready: false, pads: [] };
  results = [];
  notices = [];
  pending;
  probes = /* @__PURE__ */ new Set();
  followState = { phase: "idle", reason: "\u5C1A\u672A\u542F\u52A8" };
  status() {
    return { running: !!this.child, state: this.state, results: [...this.results], notices: [...this.notices], follow: this.followState };
  }
  followBusy() {
    return ["requested", "countdown", "baseline", "right", "up", "following"].includes(this.followState.phase);
  }
  notice(value) {
    this.notices.push(value.slice(0, 2e3));
    if (this.notices.length > 20) this.notices.shift();
  }
  executable() {
    return import_node_path.default.join(this.runtime, "DungeonsInput.exe");
  }
  options() {
    return { cwd: this.runtime, windowsHide: true, stdio: "pipe" };
  }
  read(child, receive) {
    let buffer = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > 8 * 1024 * 1024) {
        this.notice("\u5B50\u8FDB\u7A0B\u8F93\u51FA\u8D85\u9650");
        child.kill();
        return;
      }
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        try {
          if (line) receive(JSON.parse(line));
        } catch {
          this.notice("\u5B50\u8FDB\u7A0B\u6D88\u606F\u65E0\u6548");
        }
      }
    });
    child.stderr.on("data", (chunk) => this.notice(String(chunk)));
  }
  async probe() {
    if (this.closed) throw new Error("\u63D2\u4EF6\u5DF2\u505C\u6B62");
    return new Promise((resolve, reject) => {
      const child = this.launch(this.executable(), ["--probe"], this.options());
      this.probes.add(child);
      let result;
      const deadline = setTimeout(() => {
        child.kill();
        reject(new Error("\u9A71\u52A8\u68C0\u67E5\u8D85\u65F6"));
      }, 1e4);
      this.read(child, (message) => {
        result = message;
      });
      child.once("error", (error) => {
        clearTimeout(deadline);
        reject(error);
      });
      child.once("close", () => {
        this.probes.delete(child);
        clearTimeout(deadline);
        result ? resolve(result) : reject(new Error("\u9A71\u52A8\u68C0\u67E5\u672A\u8FD4\u56DE\u7ED3\u679C"));
      });
    });
  }
  start() {
    if (this.closed) throw new Error("\u63D2\u4EF6\u5DF2\u505C\u6B62");
    if (this.child) throw new Error("\u6D4B\u8BD5\u624B\u67C4\u5DF2\u7ECF\u542F\u52A8\u6216\u6B63\u5728\u9000\u51FA");
    if (process.platform !== "win32" || process.arch !== "x64") throw new Error("\u6D4B\u8BD5\u7248\u9700\u8981 Windows x64");
    this.results = [];
    this.notices = [];
    this.pending = void 0;
    this.state = { ready: false, pads: [] };
    this.followState = { phase: "idle", reason: "\u5C1A\u672A\u542F\u52A8" };
    const child = this.launch(this.executable(), [], this.options());
    this.child = child;
    this.read(child, (message) => {
      if (this.child !== child) return;
      if (message.type === "state") this.state = message;
      else if (message.type === "follow") this.followState = message;
      else if (message.type === "result") {
        const index = this.results.findIndex((entry) => entry.id === message.id);
        if (index >= 0) this.results[index] = message;
        else this.results.push(message);
        if (this.results.length > 30) this.results.shift();
        if (message.status !== "scheduled" && message.status !== "active" && message.id === this.pending) this.pending = void 0;
      } else this.notice(message.error || message.reason || JSON.stringify(message));
    });
    this.heartbeat = setInterval(() => this.send({ type: "heartbeat" }), 500);
    child.stdin.on("error", (error) => this.notice(error.message));
    child.once("error", (error) => this.notice(error.message));
    child.once("close", () => {
      if (this.child !== child) return;
      clearInterval(this.heartbeat);
      this.heartbeat = void 0;
      this.child = void 0;
      if (this.pending) this.results.push({ id: this.pending, status: "disconnected", reason: "\u8F93\u5165\u8FDB\u7A0B\u9000\u51FA\uFF1B\u4E0D\u91CD\u653E\u8BF7\u6C42\u3002\u53D1\u9001\u8FC7\u7684\u8F93\u5165\u4E0D\u7B49\u4E8E\u6E38\u620F\u52A8\u4F5C\u6210\u529F\u3002" });
      this.pending = void 0;
      this.state = { ...this.state, ready: false, pads: [] };
      this.followState = { phase: "stopped", reason: "\u8F93\u5165\u8FDB\u7A0B\u9000\u51FA\uFF1B\u4E0D\u4F1A\u6062\u590D\u8DDF\u968F" };
    });
    return this.status();
  }
  send(message) {
    if (this.child?.stdin.writable) this.child.stdin.write(JSON.stringify(message) + "\n");
  }
  pulse(value) {
    const request = validatePulse(value);
    if (this.closed || !this.child || !this.state.ready) throw new Error("\u5148\u521B\u5EFA\u4E24\u53EA\u6D4B\u8BD5\u624B\u67C4");
    if (this.pending) throw new Error("\u5DF2\u6709\u8109\u51B2\u6392\u961F\u6216\u6267\u884C\uFF0C\u5148\u7B49\u5F85\u6216\u505C\u6B62");
    if (this.followBusy()) throw new Error("\u5148\u505C\u6B62\u89C2\u5BDF/\u8DDF\u968F\uFF0C\u518D\u624B\u52A8\u8F93\u5165");
    const id = (0, import_node_crypto.randomUUID)();
    this.pending = id;
    const result = { id, status: "scheduled", ...request };
    this.results.push(result);
    this.send({ type: "pulse", id, ...request });
    return result;
  }
  follow(value, observeOnly = false) {
    const request = validateFollow(value, observeOnly);
    if (this.closed || !this.child || !this.state.ready) throw new Error("\u5148\u521B\u5EFA\u4E24\u53EA\u6D4B\u8BD5\u624B\u67C4");
    if (this.pending || this.followBusy()) throw new Error("\u5DF2\u6709\u8109\u51B2\u6216\u89C2\u5BDF/\u8DDF\u968F\uFF0C\u5148\u7B49\u5F85\u6216\u505C\u6B62");
    this.followState = { phase: "requested", reason: "\u8BF7\u6C42\u5DF2\u63D0\u4EA4\uFF0C\u7B49\u5F85\u8F93\u5165\u8FDB\u7A0B\u786E\u8BA4", observeOnly };
    this.send({ type: observeOnly ? "follow-observe" : "follow-start", ...request });
    return this.followState;
  }
  cancel() {
    this.send({ type: "cancel" });
    return { requested: true };
  }
  async stop() {
    if (this.shutdown) return this.shutdown;
    const child = this.child;
    if (!child) return;
    this.shutdown = new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        child.kill();
        forceDeadline = setTimeout(() => reject(new Error("\u5B50\u8FDB\u7A0B\u5C1A\u672A\u786E\u8BA4\u9000\u51FA\uFF0C\u8BF7\u68C0\u67E5\u72B6\u6001")), 2e3);
      }, 2e3);
      let forceDeadline;
      child.once("close", () => {
        clearTimeout(deadline);
        clearTimeout(forceDeadline);
        resolve();
      });
      this.send({ type: "stop" });
    }).finally(() => {
      this.shutdown = void 0;
    });
    return this.shutdown;
  }
  async close() {
    this.closed = true;
    for (const child of this.probes) child.kill();
    await this.stop();
  }
};

// plugins/dungeons-input/src/index.ts
var createPlugin = (create = () => new InputManager(import_node_path2.default.join(__dirname, "runtime"))) => ({
  register(ctx) {
    const manager = create();
    ctx.onDispose(() => manager.close());
    ctx.registerIpc("input-status", () => manager.status());
    ctx.registerIpc("input-probe", () => manager.probe());
    ctx.registerIpc("input-start", () => {
      ctx.signal.throwIfAborted();
      return manager.start();
    });
    ctx.registerIpc("input-pulse", (request) => {
      ctx.signal.throwIfAborted();
      return manager.pulse(request);
    });
    ctx.registerIpc("input-cancel", () => manager.cancel());
    ctx.registerIpc("input-stop", () => manager.stop());
    ctx.registerIpc("follow-observe", (request) => {
      ctx.signal.throwIfAborted();
      return manager.follow(request, true);
    });
    ctx.registerIpc("follow-start", (request) => {
      ctx.signal.throwIfAborted();
      return manager.follow(request);
    });
  }
});
var index_default = createPlugin();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPlugin
});
