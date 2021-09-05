import { Application, Router, HttpServerStd } from "https://deno.land/x/oak@v9.0.0/mod.ts";

import { mountConsumer, BaseConsumer, InMemoryLayer } from "../mod.ts"

const app = new Application({serverConstructor: HttpServerStd});
const router = new Router();

const layer = new InMemoryLayer();

class EchoConsumer extends BaseConsumer {
    // deno-lint-ignore require-await
    async onText(text: string){
        this.send(text);
    }
}

router.all("/ws", mountConsumer(EchoConsumer, layer));

app.use(router.routes());
app.use((ctx) => {
  ctx.response.body = "Hello World!";
});

await app.listen({ port: 8000 });