import {
  RouteParams,
  RouterContext as Context,
  RouterMiddleware as Middleware,
  State,
  Status,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { Layer } from "./layers/index.ts";

export interface Consumer extends EventTarget {
  run: () => Promise<void>;
  onText: (text: string) => Promise<void>;
  onBinary: (buf: Uint8Array) => Promise<void>;
  onGroupMessage: (
    groupName: string,
    textOrBinary: string | Uint8Array,
  ) => Promise<void>;
  groupSend: (groupName: string, message: string | Uint8Array) => Promise<void>;
  onConnect: () => Promise<void>;
  onClose: () => Promise<void>;
  close: (code?: number, reason?: string) => void;
  layer: Layer;
}

interface ConsumerConstructor<P extends RouteParams, S extends State> {
  new (context: Context<P, S & { consumer: Consumer }>, websocket: WebSocket, layer: Layer): Consumer;
}

export function mountConsumer<P extends RouteParams, S extends State>(
  ConsumerClass: ConsumerConstructor<P, S>,
  layer: Layer,
): Middleware<P, S & { consumer: Consumer }> {
  return async (context: Context<P, S & { consumer: Consumer }>, next: () => Promise<unknown>) => {
    if (!context.isUpgradable) {
      context.response.status = Status.NotFound;
      return;
    }
    const websocket = await context.upgrade();
    websocket.addEventListener("close", async () => {
      await layer.removeConsumer(consumer);
      await consumer.onClose()
    })
    const consumer = new ConsumerClass(context, websocket, layer);
    context.state["consumer"] = consumer;
    await consumer.run();
    await next();
  };
}

export class BaseConsumer extends EventTarget implements Consumer {
  send: WebSocket["send"];
  close: WebSocket["close"];
  constructor(
    public context: Context,
    public websocket: WebSocket,
    public layer: Layer,
  ) {
    super()
    this.send = websocket.send.bind(websocket);
    this.close = websocket.close.bind(websocket);
  }
  run = async () => {
    this.websocket.addEventListener("message", this.onMessage);
    await this.onConnect();
  };
  async onClose(){
  }
  private onMessage = async (
    event: MessageEvent<string | ArrayBufferLike | Blob>,
  ) => {
    const data = event.data;
    if (typeof data === "string") {
      await this.onText(data);
    } else if (data instanceof Uint8Array) {
      await this.onBinary(data);
    } else if (data instanceof Blob) {
      await this.onBinary(
        new Uint8Array(await (data.arrayBuffer() as Promise<Uint8Array>)),
      );
    } else {
      throw new Error("unknown data format");
    }
  };
  async onText(_text: string) {
  }
  async onBinary(_buf: Uint8Array) {
  }
  async onGroupMessage(_group: string, _textOrBinary: string | Uint8Array) {
  }
  async onConnect(): Promise<void> {
  }
  async groupJoin(groupName: string) {
    await this.layer.groupJoin(this, groupName);
  }
  async groupLeave(groupName: string) {
    await this.layer.groupLeave(this, groupName);
  }
  async groupSend(groupName: string, message: string | Uint8Array) {
    await this.layer.groupSend(groupName, message);
  }
}

export class JSONConsumer<ReceiveType, SendType> extends BaseConsumer {
  textDecoder = new TextDecoder();
  textEncoder = new TextEncoder();
  async onText(text: string) {
    try {
      const data = JSON.parse(text);
      await this.onJSON(data);
      // deno-lint-ignore no-empty
    } catch (_error) {}
  }
  async onBinary(buf: Uint8Array) {
    try {
      const text = this.textDecoder.decode(buf);
      const data = JSON.parse(text);
      await this.onJSON(data);
      // deno-lint-ignore no-empty
    } catch (_error) {}
  }
  async onJSON(_value: ReceiveType) {
  }
  sendJSON(value: SendType, { binary = false }: { binary?: boolean } = {}) {
    const text = JSON.stringify(value);
    if (binary) {
      const data = this.textEncoder.encode(text);
      this.send(data);
    } else {
      this.send(text);
    }
  }
}
