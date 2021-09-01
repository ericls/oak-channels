import { Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts"

import { createWebsocketMockContext } from "./lib/oak_ws_test_utils.ts";
import { BaseConsumer, mountConsumer } from "../consumer.ts";

Deno.test({
  name: "Call onBinary",
  fn() {
    let cb = () => {};
    class MyConsumer extends BaseConsumer {
      async onConnect() {
        await super.onConnect();
        this.send("hi");
      }
      onBinary(data: unknown) {
        cb();
        assertEquals(data, new Uint8Array([1,2,3,4]))
        return Promise.resolve()
      }
    }

    const router = new Router();
    router.all("/ws", mountConsumer(MyConsumer));
    const context = createWebsocketMockContext({ "path": "/ws" });
    const done = new Promise<void>((resolve) => {
      cb = resolve;
      router.routes()(context, () => {
        context.websocket.client.send(new Uint8Array([1, 2, 3, 4]));
        return Promise.resolve()
      });
    });
    return done;
  },
});

Deno.test({
  name: "Call onText",
  fn() {
    let cb = () => {};
    class MyConsumer extends BaseConsumer {
      async onConnect() {
        await super.onConnect();
        this.send("hi");
      }
      onText(data: unknown) {
        assertEquals(data, "hi");
        cb();
        return Promise.resolve()
      }
    }

    const router = new Router();
    router.all("/ws", mountConsumer(MyConsumer));
    const context = createWebsocketMockContext({ "path": "/ws" });
    const done = new Promise<void>((resolve) => {
      cb = resolve;
      router.routes()(context, () => {
        context.websocket.client.send("hi");
        return Promise.resolve()
      });
    });
    return done;
  },
});