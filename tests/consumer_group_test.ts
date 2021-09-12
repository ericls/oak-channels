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
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 2)
    await layer.groupSend("foo", "123");
    await groupMessageWaiter.promise;
    assertEquals(groupMessageWaiter.count, 2);
  },
});

Deno.test({
  name: "Can leave group",
  async fn() {
    const layer = new InMemoryLayer();
    const connectWaiter = counterWaiter(2);
    class MyConsumer extends BaseConsumer {
      async onConnect() {
        await super.onConnect();
        await this.groupJoin("foo");
        await this.groupLeave("foo");
        connectWaiter.ready();
      }
    }

    const router = new Router();
    router.all("/ws", mountConsumer(MyConsumer, layer));
    const context1 = createWebsocketMockContext({ "path": "/ws" });
    router.routes()(context1, async () => {});
    const context2 = createWebsocketMockContext({ "path": "/ws" });
    router.routes()(context2, async () => {});
    await connectWaiter.promise;
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 0)
  },
});

Deno.test({
  name: "Can join multiple groups and receive messages",
  async fn() {
    const layer = new InMemoryLayer();
    const connectWaiter = counterWaiter(1);
    const groupMessageWaiter = counterWaiter(2);
    class MyConsumer extends BaseConsumer {
      async onConnect() {
        await super.onConnect();
        await this.groupJoin("foo");
        await this.groupJoin("bar");
        connectWaiter.ready();
      }
      // deno-lint-ignore require-await
      async onGroupMessage(group: string, textOrBinary: string | Uint8Array) {
        if (group === "foo") {
          assertEquals(textOrBinary, "123");
        } else if (group === "bar") {
          assertEquals(textOrBinary, new Uint8Array([1,2,3,4]))
        }
        groupMessageWaiter.ready(textOrBinary);
      }
    }

    const router = new Router();
    router.all("/ws", mountConsumer(MyConsumer, layer));
    const context = createWebsocketMockContext({ "path": "/ws" });
    router.routes()(context, async () => {});
    await connectWaiter.promise;
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 1)
    assertEquals(layer.consumerGroupMap.getConsumers("bar").length, 1)
    await layer.groupSend("foo", "123");
    await layer.groupSend("bar", new Uint8Array([1,2,3,4]));
    await groupMessageWaiter.promise;
    assertEquals(groupMessageWaiter.calls, [["123"], [new Uint8Array([1,2,3,4])]])
  },
});

Deno.test({
  name: "Disconnection leaves all groups",
  async fn() {
    const layer = new InMemoryLayer();
    const connectWaiter = counterWaiter(2);
    const groupMessageWaiter = counterWaiter(1);
    const closeWaiter = counterWaiter(1);
    class MyConsumer extends BaseConsumer {
      async onConnect() {
        await super.onConnect();
        await this.groupJoin("foo");
        connectWaiter.ready();
      }
      // deno-lint-ignore require-await
      async onClose() {
        closeWaiter.ready();
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
    context2.state.consumer.websocket.dispatchEvent(new CloseEvent("close"))
    await closeWaiter.promise;
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 1)
    await layer.groupSend("foo", "123");
    await groupMessageWaiter.promise;
  },
});