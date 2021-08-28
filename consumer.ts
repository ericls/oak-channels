import {
  RouterContext as Context,
  RouterMiddleware as Middleware,
  Status,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";

interface Consumer {
  run: () => Promise<void>;
  onText: (text: string) => Promise<void>;
  onBinary: (buf: Uint8Array) => Promise<void>;
  onConnect: () => Promise<void>;
  close: (code?: number, reason?: string) => void;
}

interface ConsumerConstructor {
  new (context: Context, websocket: WebSocket): Consumer;
}

export function mountConsumer(ConsumerClass: ConsumerConstructor): Middleware {
  return async (context: Context, next: () => Promise<unknown>) => {
    if (!context.isUpgradable) {
      context.response.status = Status.NotFound;
      return;
    }
    const websocket = await context.upgrade();
    const consumer = new ConsumerClass(context, websocket);
    await consumer.run();
    await next();
  };
}

// Websocket is by nature stateful
// so it's more suitable to write consumers as classes
export class BaseConsumer implements Consumer {
  send: WebSocket["send"];
  close: WebSocket["close"];
  constructor(public context: Context, public websocket: WebSocket) {
    this.send = websocket.send;
    this.close = websocket.close;
  }
  run = async () => {
    await this.onConnect();
  };
  onText = async (text: string) => {
  };
  onBinary: (buf: Uint8Array) => Promise<void> = async (buf: Uint8Array) => {
  };
  onConnect: () => Promise<void> = async () => {
  };
}
