import {
  Application,
  HttpServerStd,
  Router,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";

import {
  BaseConsumer,
  InMemoryLayer,
  JSONConsumer,
  mountConsumer,
} from "https://deno.land/x/oak_channels/mod.ts";

const app = new Application({ serverConstructor: HttpServerStd });
const router = new Router();

const layer = new InMemoryLayer();

class EchoConsumer extends BaseConsumer {
  async onConnect() {
    // add this consumer to group "foo"
    await this.groupJoin("foo");
    // send group message to all consumers in group "foo"
    await this.groupSend("foo", "new user joined");
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

class JSONEchoConsumer
  extends JSONConsumer<{ ping: number }, { pong: number }> {
  // deno-lint-ignore require-await
  async onJSON(data: { ping: number }) {
    this.sendJSON({ pong: data.ping });
  }
}

router.all("/index.js", (context) => {
  context.response.body = `
    const host = window.location.host;
    const scheme = window.location.protocol === "http:" ? "ws" : "wss";
    const baseURL = \`\${scheme}://\${host}\`;
    const jsonws = new WebSocket(baseURL + '/ws-json');
    const ws = new WebSocket(baseURL + '/ws');
    ws.addEventListener("message", (e) => console.log("received", e.data));
    jsonws.addEventListener("message", (e) => console.log("received", JSON.parse(e.data)));
    ws.onopen = () => {
      console.log("sending 'foo'");
      ws.send('foo');
    }
    jsonws.onopen = () => {
      console.log("sending json");
      jsonws.send(JSON.stringify({ping: new Date().getTime()}))
    }
    window.ws = ws;
    window.jsonws = jsonws;
  `;
});
router.all("/ws", mountConsumer(EchoConsumer, layer));
router.all("/ws-json", mountConsumer(JSONEchoConsumer, layer));

app.use(router.routes());
app.use((ctx) => {
  ctx.response.body = `
    <html>
    <head><title>oak-channels echo example</title></head>
    <body>
    <script src="/index.js"></script>
    </body>
  `;
});

await app.listen({ port: 8000 });
