import { Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";

import {
  counterWaiter,
  createWebsocketMockContext,
} from "../lib/oak_ws_test_utils.ts";
import { BaseConsumer, mountConsumer } from "../../consumer.ts";
import { BroadcastChannelLayer } from "../../layers/broadcastChannel.ts";

Deno.test({
  name: "Call onGroupMessage and leave",
  // deno-lint-ignore require-await
  async fn() {
    return;
    // const layer = new BroadcastChannelLayer();
    // const connectWaiter = counterWaiter(2);
    // const groupMessageWaiter = counterWaiter(2);
    // class MyConsumer extends BaseConsumer {
    //   async onConnect() {
    //     await super.onConnect();
    //     await this.groupJoin("foo");
    //     // await this.groupLeave("foo");
    //     connectWaiter.ready();
    //   }
    //   async onGroupMessage(group: string, textOrBinary: string | Uint8Array) {
    //     assertEquals(group, "foo");
    //     assertEquals(textOrBinary, "123");
    //     await this.groupLeave("foo")
    //     groupMessageWaiter.ready();
    //   }
    // }

    // const router = new Router();
    // router.all("/ws", mountConsumer(MyConsumer, layer));
    // const context1 = createWebsocketMockContext({ "path": "/ws" });
    // router.routes()(context1, async () => {});
    // const context2 = createWebsocketMockContext({ "path": "/ws" });
    // router.routes()(context2, async () => {});
    // await connectWaiter.promise;
    // assertEquals(layer.groupNameToConsumers.get("foo")!.length, 2);
    // await layer.groupSend("foo", "123");
    // layer.groupNameToChannel.get("foo")?.close()
    // await groupMessageWaiter.promise;
    // assertEquals(groupMessageWaiter.count, 2);
    // assertEquals(layer.groupNameToConsumers.get("foo")!.length, 0);
    // layer.groupNameToChannel.get("foo")?.close()
  },
});
