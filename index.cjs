"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/dungeons-decision/src/index.ts
var index_exports = {};
__export(index_exports, {
  createPlugin: () => createPlugin,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// plugins/dungeons-decision/src/session.ts
var import_node_crypto = require("node:crypto");

// plugins/dungeons-decision/src/policy.ts
function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("\u89C2\u5BDF\u5B57\u6BB5\u5FC5\u987B\u662F\u5BF9\u8C61");
  return value;
}
function number(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw Error("\u89C2\u5BDF\u6570\u5B57\u8D85\u51FA\u8303\u56F4");
  return value;
}
function flag(value) {
  if (value === null || typeof value === "boolean") return value;
  throw Error("\u672A\u77E5\u72B6\u6001\u8BF7\u586B\u5199 null\uFF0C\u5DF2\u77E5\u72B6\u6001\u586B\u5199 true/false");
}
function point(value) {
  if (value === null) return null;
  const p = record(value);
  return { x: number(p.x, 0, 1), y: number(p.y, 0, 1) };
}
function parseObservation(value) {
  const o = record(value), self = record(o.self), leader = record(o.leader), paths = record(o.paths);
  if (typeof o.id !== "string" || !o.id.trim() || o.id.length > 80) throw Error("\u89C2\u5BDF ID \u65E0\u6548");
  if (o.source !== "simulation" && o.source !== "manual") throw Error("\u6B64\u7248\u4EC5\u63A5\u53D7\u6A21\u62DF\u6216\u624B\u5DE5\u89C2\u5BDF");
  if (!["playing", "menu", "loading", "unknown"].includes(String(o.scene))) throw Error("\u573A\u666F\u65E0\u6548");
  if (typeof o.foreground !== "boolean") throw Error("\u524D\u53F0\u72B6\u6001\u65E0\u6548");
  let enemy = null;
  if (o.enemy !== null) {
    const e = record(o.enemy), position = point(e.position);
    if (!position) throw Error("\u654C\u4EBA\u4F4D\u7F6E\u672A\u77E5\u65F6\u4E0D\u80FD\u6307\u5B9A\u654C\u4EBA\u76EE\u6807");
    enemy = { position, threatens: flag(e.threatens), meleeReach: flag(e.meleeReach), clearShot: flag(e.clearShot) };
  }
  const arrows = o.arrows === null ? null : number(o.arrows, 0, 1e5);
  if (arrows !== null && !Number.isInteger(arrows)) throw Error("\u7BAD\u6570\u5FC5\u987B\u662F\u6574\u6570");
  return {
    id: o.id,
    capturedAt: number(o.capturedAt, 0, Number.MAX_SAFE_INTEGER),
    source: o.source,
    scene: o.scene,
    foreground: o.foreground,
    confidence: number(o.confidence, 0, 1),
    self: { position: point(self.position), health: self.health === null ? null : number(self.health, 0, 1), downed: flag(self.downed), potionReady: flag(self.potionReady), dodgeReady: flag(self.dodgeReady) },
    leader: { position: point(leader.position), downed: flag(leader.downed), reviveAvailable: flag(leader.reviveAvailable) },
    enemy,
    arrows,
    imminentDanger: flag(o.imminentDanger),
    escape: point(o.escape),
    paths: { leader: flag(paths.leader), escape: flag(paths.escape) }
  };
}
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var choice = (action, reason, target) => ({ action, reason, durationMs: action === "release" || action === "wait" ? 0 : action === "revive" ? 400 : 200, ...target ? { target } : {} });
function decide(o, now) {
  if (!Number.isFinite(now) || o.capturedAt > now || now - o.capturedAt > 1500) return choice("release", "\u89C2\u5BDF\u5DF2\u8FC7\u671F\u6216\u65F6\u95F4\u5F02\u5E38\uFF0C\u91CA\u653E\u5E76\u7B49\u5F85\u65B0\u89C2\u5BDF");
  if (!o.foreground || o.scene !== "playing") return choice("release", "\u6E38\u620F\u5931\u7126\u6216\u5904\u4E8E\u83DC\u5355/\u52A0\u8F7D\uFF0C\u505C\u6B62\u52A8\u4F5C");
  if (o.confidence < 0.85) return choice("release", "\u89C2\u5BDF\u53EF\u4FE1\u5EA6\u4E0D\u8DB3\uFF0C\u91CD\u65B0\u786E\u8BA4\u753B\u9762");
  if (!o.self.position || o.self.health === null || o.self.downed === null || o.leader.downed === null || o.imminentDanger === null) return choice("release", "\u81EA\u8EAB\u3001\u961F\u53CB\u6216\u5371\u9669\u72B6\u6001\u4E0D\u660E\uFF0C\u4E0D\u80FD\u884C\u52A8");
  if (o.self.downed || o.self.health === 0) return choice("release", "\u6614\u6D9F\u5DF2\u5012\u5730\uFF0C\u7B49\u5F85\u961F\u53CB\u6551\u63F4\uFF0C\u4E0D\u81EA\u884C\u64CD\u4F5C\u590D\u6D3B\u83DC\u5355");
  if (o.enemy && o.enemy.threatens === null) return choice("release", "\u654C\u4EBA\u5A01\u80C1\u72B6\u6001\u672A\u77E5\uFF0C\u5148\u786E\u8BA4");
  if (o.imminentDanger) {
    if (o.escape && o.paths.escape === true && o.self.dodgeReady === true) return choice("dodge", "\u5371\u9669\u5373\u5C06\u547D\u4E2D\uFF0C\u5411\u786E\u8BA4\u5B89\u5168\u7684\u843D\u70B9\u95EA\u907F", o.escape);
    if (o.escape && o.paths.escape === true) return choice("retreat", "\u5371\u9669\u4E34\u8FD1\u4E14\u65E0\u6CD5\u786E\u8BA4\u95EA\u907F\u53EF\u7528\uFF0C\u77ED\u79FB\u81F3\u5B89\u5168\u4F4D\u7F6E", o.escape);
    return choice("release", "\u5371\u9669\u4E34\u8FD1\u4F46\u6CA1\u6709\u786E\u8BA4\u5B89\u5168\u7684\u9000\u8DEF\uFF0C\u4E0D\u76F2\u76EE\u7FFB\u6EDA");
  }
  if (o.self.health <= 0.3) {
    if (o.self.potionReady === true) return choice("heal", "\u751F\u547D\u503C\u504F\u4F4E\u4E14\u836F\u6C34\u53EF\u7528\uFF0C\u4F18\u5148\u6CBB\u7597");
    if (o.enemy && o.escape && o.paths.escape === true) return choice("retreat", "\u751F\u547D\u503C\u504F\u4F4E\u4E14\u836F\u6C34\u4E0D\u53EF\u7528\uFF0C\u6CBF\u786E\u8BA4\u9000\u8DEF\u8131\u79BB\u6218\u6597", o.escape);
    return choice("wait", "\u751F\u547D\u503C\u504F\u4F4E\uFF0C\u7B49\u5F85\u836F\u6C34\u72B6\u6001\u6216\u5B89\u5168\u9000\u8DEF\uFF0C\u4E0D\u7EE7\u7EED\u8FDB\u653B");
  }
  if (!o.leader.position) return choice("release", "\u770B\u4E0D\u5230\u7ED1\u5B9A\u961F\u53CB\uFF0C\u505C\u6B62\u8FFD\u8E2A\uFF0C\u4E0D\u51ED\u65E7\u4F4D\u7F6E\u5BFB\u627E");
  const separation = distance(o.self.position, o.leader.position);
  if (o.leader.downed) {
    if (o.enemy || o.self.health < 0.6) return choice("wait", "\u6551\u63F4\u533A\u57DF\u4ECD\u6709\u654C\u4EBA\u6216\u81EA\u8EAB\u72B6\u6001\u4E0D\u8DB3\uFF0C\u6682\u4E0D\u6551\u63F4");
    if (separation <= 0.1 && o.leader.reviveAvailable === true) return choice("revive", "\u961F\u53CB\u5012\u5730\u4E14\u6551\u63F4\u63D0\u793A\u5DF2\u786E\u8BA4\uFF0C\u77ED\u65F6\u6551\u63F4\u540E\u91CD\u65B0\u89C2\u5BDF", o.leader.position);
    if (separation > 0.1 && o.paths.leader === true) return choice("follow", "\u6CBF\u786E\u8BA4\u8DEF\u5F84\u63A5\u8FD1\u5012\u5730\u961F\u53CB\uFF0C\u6682\u4E0D\u6309\u6551\u63F4\u6309\u94AE", o.leader.position);
    return choice("wait", "\u6551\u63F4\u63D0\u793A\u6216\u63A5\u8FD1\u8DEF\u5F84\u4E0D\u660E\uFF0C\u7B49\u5F85\u786E\u8BA4");
  }
  if (separation > 0.28) {
    if (o.enemy?.threatens === true && o.enemy.meleeReach === true) return choice("melee", "\u843D\u540E\u4E8E\u961F\u53CB\u4F46\u8FD1\u8EAB\u654C\u4EBA\u6B63\u5728\u5A01\u80C1\uFF0C\u5148\u77ED\u65F6\u81EA\u536B", o.enemy.position);
    return o.paths.leader === true ? choice("follow", "\u4E0E\u961F\u53CB\u8DDD\u79BB\u8FC7\u8FDC\uFF0C\u4F18\u5148\u5F52\u961F\uFF0C\u4E0D\u8FFD\u9010\u8FDC\u654C", o.leader.position) : choice("wait", "\u5F52\u961F\u8DEF\u5F84\u672A\u786E\u8BA4\uFF0C\u4E0D\u8DE8\u8D8A\u672A\u77E5\u5730\u5F62");
  }
  if (o.enemy) {
    if (o.enemy.meleeReach === true) return choice("melee", "\u5DF2\u786E\u8BA4\u8FD1\u6218\u53EF\u53CA\u76EE\u6807\uFF0C\u77ED\u65F6\u534F\u52A9\u6218\u6597", o.enemy.position);
    if (o.enemy.clearShot === true && o.arrows !== null && o.arrows > 0) return choice("ranged", "\u76EE\u6807\u53EF\u5C04\u51FB\u4E14\u6709\u7BAD\uFF0C\u77ED\u65F6\u8FDC\u7A0B\u534F\u52A9", o.enemy.position);
    return choice("wait", "\u654C\u4EBA\u4E0D\u5728\u5DF2\u786E\u8BA4\u8FD1\u6218\u8303\u56F4\u6216\u5C04\u7EBF/\u7BAD\u6570\u4E0D\u660E\uFF0C\u4E0D\u76F2\u76EE\u653B\u51FB\u6216\u8FFD\u51FB");
  }
  if (separation > 0.12) return o.paths.leader === true ? choice("follow", "\u4FDD\u6301\u966A\u4F34\u8DDD\u79BB\uFF0C\u6CBF\u786E\u8BA4\u8DEF\u5F84\u8DDF\u968F", o.leader.position) : choice("wait", "\u8DDF\u968F\u8DEF\u5F84\u672A\u786E\u8BA4\uFF0C\u7B49\u5F85\u961F\u53CB\u6216\u65B0\u89C2\u5BDF");
  return choice("wait", "\u5DF2\u5728\u961F\u53CB\u9644\u8FD1\uFF0C\u4FDD\u6301\u7A7A\u95F2");
}

// plugins/dungeons-decision/src/session.ts
var DecisionSession = class {
  stopped = false;
  pending;
  reports = [];
  seen = /* @__PURE__ */ new Set();
  latest = -1;
  consumed = /* @__PURE__ */ new Set();
  status() {
    return structuredClone({ simulationOnly: true, gameInputSent: false, stopped: this.stopped, pending: this.pending, reports: this.reports });
  }
  cancel() {
    if (this.pending) this.pending.status = "cancelled";
    this.pending = void 0;
  }
  append(o, decision) {
    const report = { ...decision, id: (0, import_node_crypto.randomUUID)(), actor: "companion", observationId: o.id, source: o.source, status: "proposed", simulationOnly: true, gameInputSent: false, gameOutcomeVerified: false };
    this.reports.push(report);
    if (this.reports.length > 30) this.reports.shift();
    if (!["wait", "release"].includes(report.action)) this.pending = report;
    return structuredClone(report);
  }
  preview(value, now = Date.now()) {
    let o;
    try {
      o = parseObservation(value);
    } catch (error) {
      this.cancel();
      throw error;
    }
    if (this.stopped) return this.append(o, { action: "release", durationMs: 0, reason: "\u5DF2\u624B\u52A8\u505C\u6B62\uFF0C\u91CD\u7F6E\u9884\u6F14\u540E\u624D\u80FD\u7EE7\u7EED" });
    if (!Number.isFinite(now) || o.capturedAt > now || now - o.capturedAt > 1500) {
      this.cancel();
      return this.append(o, decide(o, now));
    }
    if (this.seen.has(o.id) || o.capturedAt <= this.latest) {
      this.cancel();
      return this.append(o, { action: "release", durationMs: 0, reason: "\u91CD\u590D\u6216\u4E71\u5E8F\u89C2\u5BDF\uFF0C\u4E0D\u91CD\u653E\u65E7\u52A8\u4F5C" });
    }
    this.seen.add(o.id);
    if (this.seen.size > 128) this.seen.delete(this.seen.values().next().value);
    this.latest = o.capturedAt;
    const decision = decide(o, now);
    if (decision.action === "release") this.cancel();
    else {
      if (o.self.potionReady === false) this.consumed.delete("heal");
      if (o.self.dodgeReady === false) this.consumed.delete("dodge");
      if (this.pending) {
        if (decision.action !== this.pending.action || JSON.stringify(decision.target) !== JSON.stringify(this.pending.target)) {
          this.cancel();
          return this.append(o, { action: "release", durationMs: 0, reason: "\u65B0\u89C2\u5BDF\u6539\u53D8\u4E86\u884C\u52A8\u6761\u4EF6\uFF0C\u53D6\u6D88\u65E7\u63D0\u6848\uFF1B\u7B49\u5F85\u4E0B\u4E00\u6B21\u89C2\u5BDF\u518D\u89C4\u5212" });
        }
        return this.append(o, { action: "wait", durationMs: 0, reason: "\u4E0A\u4E00\u6B21\u63D0\u6848\u5C1A\u672A\u53CD\u9988\uFF0C\u4E0D\u53E0\u52A0\u6216\u8865\u53D1\u52A8\u4F5C" });
      }
    }
    if ((decision.action === "heal" || decision.action === "dodge") && this.consumed.has(decision.action)) return this.append(o, { action: "wait", durationMs: 0, reason: "\u6A21\u62DF\u4E2D\u5DF2\u4F7F\u7528\u6B64\u80FD\u529B\uFF0C\u9700\u8981\u89C2\u5BDF\u4E0D\u53EF\u7528\u518D\u6062\u590D\u53EF\u7528\uFF0C\u4E0D\u80FD\u5047\u5B9A\u51B7\u5374\u5DF2\u7ED3\u675F" });
    return this.append(o, decision);
  }
  feedback(id, status) {
    if (!this.pending || id !== this.pending.id) throw Error("\u53EA\u80FD\u53CD\u9988\u5F53\u524D\u5F85\u786E\u8BA4\u63D0\u6848\uFF0C\u4E0D\u80FD\u91CD\u653E\u65E7\u7ED3\u679C");
    if (status !== "simulated-complete" && status !== "simulated-failed") throw Error("\u6B64\u7248\u4EC5\u63A5\u53D7\u6A21\u62DF\u53CD\u9988");
    this.pending.status = status;
    if (status === "simulated-complete" && (this.pending.action === "heal" || this.pending.action === "dodge")) this.consumed.add(this.pending.action);
    this.pending = void 0;
    return this.status();
  }
  stop() {
    this.stopped = true;
    this.cancel();
    return this.status();
  }
  reset() {
    this.cancel();
    this.stopped = false;
    this.seen.clear();
    this.latest = -1;
    this.consumed.clear();
    this.reports = [];
    return this.status();
  }
};

// plugins/dungeons-decision/src/scenarios.ts
var scenarios = [
  { id: "idle", name: "\u961F\u53CB\u8EAB\u8FB9\u5F85\u547D", expected: "wait", patch: {} },
  { id: "follow", name: "\u6CBF\u5B89\u5168\u8DEF\u5F84\u8DDF\u968F", expected: "follow", patch: { leader: { position: { x: 0.8, y: 0.5 }, downed: false, reviveAvailable: false } } },
  { id: "blocked", name: "\u8DDF\u968F\u8DEF\u5F84\u4E0D\u660E", expected: "wait", patch: { leader: { position: { x: 0.8, y: 0.5 }, downed: false, reviveAvailable: false }, paths: { leader: null, escape: true } } },
  { id: "melee", name: "\u534F\u52A9\u8FD1\u6218", expected: "melee", patch: { enemy: { position: { x: 0.55, y: 0.5 }, threatens: true, meleeReach: true, clearShot: false } } },
  { id: "ranged", name: "\u6709\u7BAD\u4E14\u5C04\u7EBF\u5DF2\u786E\u8BA4", expected: "ranged", patch: { enemy: { position: { x: 0.7, y: 0.5 }, threatens: false, meleeReach: false, clearShot: true } } },
  { id: "heal", name: "\u4F4E\u8840\u91CF\u4F18\u5148\u6CBB\u7597", expected: "heal", patch: { self: { position: { x: 0.5, y: 0.5 }, health: 0.2, downed: false, potionReady: true, dodgeReady: true } } },
  { id: "retreat", name: "\u4F4E\u8840\u65E0\u836F\u6CBF\u9000\u8DEF\u64A4\u79BB", expected: "retreat", patch: { self: { position: { x: 0.5, y: 0.5 }, health: 0.2, downed: false, potionReady: false, dodgeReady: true }, enemy: { position: { x: 0.55, y: 0.5 }, threatens: true, meleeReach: true, clearShot: false } } },
  { id: "dodge", name: "\u8FEB\u8FD1\u5371\u9669\u4F18\u5148\u95EA\u907F", expected: "dodge", patch: { imminentDanger: true } },
  { id: "revive", name: "\u786E\u8BA4\u63D0\u793A\u540E\u5B89\u5168\u6551\u63F4", expected: "revive", patch: { leader: { position: { x: 0.55, y: 0.5 }, downed: true, reviveAvailable: true } } },
  { id: "downed", name: "\u81EA\u8EAB\u5012\u5730\u7B49\u5F85\u6551\u63F4", expected: "release", patch: { self: { position: { x: 0.5, y: 0.5 }, health: 0, downed: true, potionReady: true, dodgeReady: true } } },
  { id: "uncertain", name: "\u8BC6\u522B\u4E0D\u53EF\u9760\u65F6\u505C\u6B62", expected: "release", patch: { confidence: 0.5 } },
  { id: "menu", name: "\u83DC\u5355\u4E2D\u4E0D\u64CD\u4F5C", expected: "release", patch: { scene: "menu" } }
];
function example(id, now) {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw Error("\u672A\u77E5\u9884\u6F14\u573A\u666F");
  return structuredClone({
    id: `simulation-${id}-${now}`,
    capturedAt: now,
    source: "simulation",
    scene: "playing",
    foreground: true,
    confidence: 0.95,
    self: { position: { x: 0.5, y: 0.5 }, health: 0.9, downed: false, potionReady: true, dodgeReady: true },
    leader: { position: { x: 0.55, y: 0.5 }, downed: false, reviveAvailable: false },
    enemy: null,
    arrows: 20,
    imminentDanger: false,
    escape: { x: 0.4, y: 0.5 },
    paths: { leader: true, escape: true },
    ...scenario.patch
  });
}

// plugins/dungeons-decision/src/index.ts
var createPlugin = () => ({
  register(ctx) {
    const session = new DecisionSession();
    ctx.onDispose(() => {
      session.stop();
    });
    ctx.registerIpc("decision-status", () => session.status());
    ctx.registerIpc("decision-examples", () => scenarios.map(({ id, name, expected }) => ({ id, name, expected })));
    ctx.registerIpc("decision-example", (id) => example(String(id), Date.now()));
    ctx.registerIpc("decision-preview", (observation) => {
      ctx.signal.throwIfAborted();
      return session.preview(observation);
    });
    ctx.registerIpc("decision-feedback", (id, status) => {
      ctx.signal.throwIfAborted();
      return session.feedback(id, status);
    });
    ctx.registerIpc("decision-stop", () => session.stop());
    ctx.registerIpc("decision-reset", () => {
      ctx.signal.throwIfAborted();
      return session.reset();
    });
  }
});
var index_default = createPlugin();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPlugin
});
