import {
  Router,
  Application,
  testing,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { createWebsocketMockContext } from "./oak_ws_test.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { BaseConsumer, mountConsumer } from "../consumer.ts";

class MyConsumer extends BaseConsumer {
  onConnect = async () => {
    this.send("hi");
  };
}

const router = new Router();
router.all("/ws", mountConsumer(MyConsumer));
router.all("/foo", (context) => {
  context.response.body = "hi";
});

Deno.test({
  name: "can mount consumer",
  async fn() {
    const context = createWebsocketMockContext({ path: "/ws" });
    const done = new Promise<void>((resolve) => {
      router.routes()(context, async () => {
        assert(context.websocket);
        resolve()
        // context.websocket?.addEventListener("message", (ev) =>{
        //   console.log("wow")
        //   assertEquals(ev.data, "hi");
        //   resolve();
        // });
      });
      // mountConsumer(MyConsumer)(context, async () => {
      //   console.log("???");
      //   resolve()
      // });
    });
    return done;
  },
});
