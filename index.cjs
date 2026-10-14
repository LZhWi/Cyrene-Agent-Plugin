"use strict";

// plugins/plugin-template/src/index.ts
var running = false;
var healthTool = {
  id: "plugin-template_health",
  name: "\u68C0\u67E5\u63D2\u4EF6\u6A21\u677F\u72B6\u6001",
  description: "\u4EC5\u5728\u9700\u8981\u9A8C\u8BC1\u63D2\u4EF6\u5F00\u53D1\u73AF\u5883\u6216\u6A21\u677F\u662F\u5426\u6B63\u5E38\u52A0\u8F7D\u65F6\u4F7F\u7528\u3002",
  enabled: true,
  risk: "safe",
  effectKind: "read",
  verificationPolicy: "none",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  async execute() {
    return running ? "\u63D2\u4EF6\u6A21\u677F\u8FD0\u884C\u6B63\u5E38" : "\u63D2\u4EF6\u6A21\u677F\u5C1A\u672A\u542F\u52A8";
  }
};
var plugin = {
  register(ctx) {
    running = true;
    ctx.registerTool(healthTool);
    ctx.onDispose(() => {
      running = false;
    });
  },
  unregister() {
    running = false;
  }
};
module.exports = plugin;
