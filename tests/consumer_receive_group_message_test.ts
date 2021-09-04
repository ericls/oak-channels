import { Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";

import {
  counterWaiter,
  createWebsocketMockContext,
} from "./lib/oak_ws_test_utils.ts";
import { BaseConsumer, mountConsumer } from "../consumer.ts";
import { InMemoryLayer } from "../layers/inMemoryLayer.ts";

Deno.test({
  name: "Call onGroupMessage",
  async fn() {
    const layer = new InMemoryLayer();
    const connectWaiter = counterWaiter(2);
    const groupMessageWaiter = counterWaiter(2);
    class MyConsumer extends BaseConsumer {
      async onConnect() {
        await super.onConnect();
        await this.groupJoin("foo");
        connectWaiter.ready();
      }
      // deno-lint-ignore require-await
      async onGroupMessage(group: string, textOrBinary: string | Uint8Array) {
        assertEquals(group, "foo");
        assertEquals(textOrBinary, "123");
        groupMessageWaiter.ready();
      }
    }

    const router = new Router();
    router.all("/ws", mountConsumer(MyConsumer, layer));
    const context1 = createWebsocketMockContext({ "path": "/ws" });
    router.routes()(context1, async () => {});
    const context2 = createWebsocketMockContext({ "path": "/ws" });
    router.routes()(context2, async () => {});
    await connectWaiter.promise;
    await layer.groupSend("foo", "123");
    await groupMessageWaiter.promise;
    assertEquals(groupMessageWaiter.count, 2);
  },
});
