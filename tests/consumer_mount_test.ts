import { Router, testing } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { assert } from "https://deno.land/std@0.106.0/testing/asserts.ts";

import { createWebsocketMockContext } from "./lib/oak_ws_test_utils.ts";
import { BaseConsumer, mountConsumer } from "../consumer.ts";
import { InMemoryLayer } from "../layers/inMemory.ts";

class MyConsumer extends BaseConsumer {
  async onConnect() {
    await super.onConnect();
    this.send("hi");
  }
}

const router = new Router();
router.all("/ws", mountConsumer(MyConsumer, new InMemoryLayer()));

Deno.test({
  name: "can mount consumer",
  fn() {
    const context = createWebsocketMockContext({
      path: "/ws",
      preUpgrade: false,
    });
    assert(context.websocket === undefined);
    const done = new Promise<void>((resolve) => {
      // deno-lint-ignore require-await
      router.routes()(context, async () => {
        assert(context.websocket);
        resolve();
      });
    });
    return done;
  },
});

Deno.test({
  name: "can receive hi from onConnect",
  fn() {
    const context = createWebsocketMockContext({ "path": "/ws" });
    assert(context.websocket);
    const done = new Promise<void>((resolve) => {
      context.websocket.client.addEventListener("message", (e) => {
        assert(e.data === "hi");
        resolve();
      });
      router.routes()(context, testing.createMockNext());
    });
    return done;
  },
});
