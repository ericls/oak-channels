import {
  RouterContext as Context,
  RouterMiddleware as Middleware,
  Status,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { Layer } from "./layers/index.ts";

export interface Consumer {
  run: () => Promise<void>;
  onText: (text: string) => Promise<void>;
  onBinary: (buf: Uint8Array) => Promise<void>;
  onGroupMessage: (
    group: string,
    textOrBinary: string | Uint8Array,
  ) => Promise<void>;
  onConnect: () => Promise<void>;
  close: (code?: number, reason?: string) => void;
  layer: Layer;
}

interface ConsumerConstructor {
  new (context: Context, websocket: WebSocket, layer: Layer): Consumer;
}

export function mountConsumer(
  ConsumerClass: ConsumerConstructor,
  layer: Layer,
): Middleware {
  return async (context: Context, next: () => Promise<unknown>) => {
    if (!context.isUpgradable) {
      context.response.status = Status.NotFound;
      return;
    }
    const websocket = await context.upgrade();
    const consumer = new ConsumerClass(context, websocket, layer);
    await consumer.run();
    await next();
  };
}

// Websocket is by nature stateful
// so it's more suitable to write consumers as classes
export class BaseConsumer implements Consumer {
  send: WebSocket["send"];
  close: WebSocket["close"];
  constructor(
    public context: Context,
    public websocket: WebSocket,
    public layer: Layer,
  ) {
    this.send = websocket.send;
    this.close = websocket.close;
  }
  run = async () => {
    this.websocket.addEventListener("message", this.onMessage);
    await this.onConnect();
  };
  private onMessage = async (
    event: MessageEvent<string | ArrayBufferLike | Blob>,
  ) => {
    const data = event.data;
    if (typeof data === "string") {
      await this.onText(data);
    } else if (data instanceof Uint8Array) {
      await this.onBinary(data);
    } else if (data instanceof Blob) {
      await this.onBinary(await (data.arrayBuffer() as Promise<Uint8Array>));
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
    await this.layer.groupJoin(this, groupName)
  }
  async groupLeave(groupName: string) {
    await this.layer.groupLeave(this, groupName)
  }
}
