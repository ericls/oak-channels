# Introduction

Inspired by django-channels. oak-channels makes it easier to write real world websocket applications.

oak-channels introduces two concepts: `Consumer` and `Layer`.

`Consumer` represents the websocket connection between a client and the server, it maintains a one-to-one relationship between a client and server and provides some helper method to send and receive messages. `Layer` facilitates sending messages across different application processes and allows consumers to join/leave groups and exchange messages within a group, it maintains many-to-many relationships between groups and consumers. 

This diagram illustrates their relationships:

<img src="https://i.imgur.com/BfqABO3.png" width="300" />

Built-in layers:
- InMemory (doesn't work across processes)
- BroadcastChannel (works with deno deploy, not fully tested)
- RedisPubSub

# Quick start
The following is a simple example on the usage of oak-channels:
```typescript
import {
  Application,
  HttpServerStd,
  Router,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import {
  BaseConsumer,
  InMemoryLayer,
  mountConsumer,
} from "https://deno.land/x/oak_channels/mod.ts";

const app = new Application({ serverConstructor: HttpServerStd });
const router = new Router();
const layer = new InMemoryLayer();

class EchoConsumer extends BaseConsumer {
  async onConnect() {
    // add this consumer to group "foo"
    await this.groupJoin("foo");
    // send group message to all consumers in group "foo", including "self"
    await this.layer.groupSend("foo", "new user joined");
  }

  // handle group messages
  async onGroupMessage(group: string, message: string | Uint8Array) {
    this.send(`${group} says ${message}`)
  }

  // handle client messages
  async onText(text: string) {
    this.send(text);
  }
}

router.all("/ws", mountConsumer(EchoConsumer, layer));
app.use(router.routes());
await app.listen({ port: 8000 });
```

An example with client side code can be found in `examples/example-echo.ts`

