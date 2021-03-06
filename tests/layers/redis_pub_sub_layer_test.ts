import { Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";

import {
  counterWaiter,
  createWebsocketMockContext,
} from "../lib/oak_ws_test_utils.ts";
import { BaseConsumer, mountConsumer } from "../..//consumer.ts";
import { RedisPubSubLayer } from "../../layers/redisPubSub.ts";

Deno.test({
  name: "Call onGroupMessage (redis-pubsub)",
  async fn() {
    const layer = new RedisPubSubLayer();
    await layer.connect();
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
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 2);
    await layer.groupSend("foo", "123");
    await groupMessageWaiter.promise;
    assertEquals(groupMessageWaiter.count, 2);
    layer.disconnect()
  },
});

Deno.test({
  name: "Can leave group (redis-pubsub)",
  async fn() {
    const layer = new RedisPubSubLayer();
    await layer.connect();
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
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 0);
    layer.disconnect()
  },
});

Deno.test({
  name: "Can join multiple groups and receive messages (redis-pubsub)",
  async fn() {
    const layer = new RedisPubSubLayer();
    await layer.connect();
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
          assertEquals(textOrBinary, "456");
        }
        groupMessageWaiter.ready(textOrBinary);
      }
    }

    const router = new Router();
    router.all("/ws", mountConsumer(MyConsumer, layer));
    const context = createWebsocketMockContext({ "path": "/ws" });
    router.routes()(context, async () => {});
    await connectWaiter.promise;
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 1);
    assertEquals(layer.consumerGroupMap.getConsumers("bar").length, 1);
    await layer.groupSend("foo", "123");
    await layer.groupSend("bar", "456");
    await groupMessageWaiter.promise;
    assertEquals(groupMessageWaiter.calls, [["123"], ["456"]])
    layer.disconnect()
  },
});

Deno.test({
  name: "Disconnection leaves all groups (redis-pubsub)",
  async fn() {
    const layer = new RedisPubSubLayer();
    await layer.connect();
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
    context2.state.consumer.websocket.dispatchEvent(new CloseEvent("close"));
    await closeWaiter.promise;
    assertEquals(layer.consumerGroupMap.getConsumers("foo").length, 1);
    await layer.groupSend("foo", "123");
    await groupMessageWaiter.promise;
    layer.disconnect()
  },
});
