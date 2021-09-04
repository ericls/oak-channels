import {
  RouteParams,
  RouterContext,
  State,
  testing,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { MockContextOptions } from "https://deno.land/x/oak@v9.0.0/testing.ts";

let NONCE = 0

export class MockWebsocket extends EventTarget implements WebSocket {
  closeCode?: number;
  closeReason?: string;
  binaryType: BinaryType = "blob";
  readonly extensions: string = "";
  protocol = "";
  readyState = WebSocket.CONNECTING;
  url = "";
  bufferedAmount = 0;
  // deno-lint-ignore no-explicit-any
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  // deno-lint-ignore no-explicit-any
  onerror: ((this: WebSocket, ev: Event | ErrorEvent) => any) | null = null;
  // deno-lint-ignore no-explicit-any
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  // deno-lint-ignore no-explicit-any
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  nonce: number;
  constructor(public otherSide?: MockWebsocket) {
    super()
    this.nonce = NONCE;
    NONCE += 1;
  }
  get client() {
    if (this.otherSide) {
      return this.otherSide;
    }
    return new MockWebsocket();
  }
  close = (code?: number, reason?: string) => {
    this.readyState = this.CLOSED;
    this.closeCode = code;
    this.closeReason = reason;
  };
  send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (!this.otherSide) {
      throw new Error("No other side of websocket")
    }
    this.otherSide.dispatchEvent(new MessageEvent("message", { data }));
  };
  addEventListener: WebSocket["addEventListener"] = (
    ...args: Parameters<WebSocket["addEventListener"]>
  ) => {
    super.addEventListener(...args);
  };
  get CLOSED() {
    return WebSocket.CLOSED;
  }

  get CLOSING() {
    return WebSocket.CLOSING;
  }

  get CONNECTING() {
    return WebSocket.CONNECTING;
  }

  get OPEN() {
    return WebSocket.OPEN;
  }
}

type WebsocketMockContext<P extends RouteParams = RouteParams> =
  & RouterContext<P>
  & {
    isUpgradable: boolean;
    _upgrade?: () => WebSocket;
  };

export function createWebsocketMockContext<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
>(
  options: MockContextOptions,
): WebsocketMockContext & { websocket: MockWebsocket};
export function createWebsocketMockContext<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
>(
  options: MockContextOptions & { preUpgrade: false },
): WebsocketMockContext & { websocket?: MockWebsocket};

export function createWebsocketMockContext<
  P extends RouteParams = RouteParams,
  // deno-lint-ignore no-explicit-any
  S extends State = Record<string, any>,
>(
  {
    app,
    ip = "127.0.0.1",
    method = "GET",
    params,
    path = "/",
    state,
    preUpgrade = true,
  }: MockContextOptions & { preUpgrade?: boolean } = {},
) {
  const context: RouterContext<P> & {
    websocket?: MockWebsocket;
    isUpgradable: boolean;
    _upgrade?: () => WebSocket;
  } = testing.createMockContext<P, S>({
    app,
    ip,
    method,
    params,
    path,
    state,
  });
  (context.isUpgradable as boolean) = true;
  const clientSocket = new MockWebsocket()
  context._upgrade = () => {
    const ws = context.websocket || new MockWebsocket();
    clientSocket.otherSide = ws;
    ws.otherSide = clientSocket;
    ws.url = path;
    context.websocket = ws;
    return ws;
  };
  // deno-lint-ignore require-await
  context.upgrade = (async () => {
    context._upgrade!();
    return context.websocket!;
  });
  if (preUpgrade) {
    context._upgrade();
  }
  return context;
}

export const counterWaiter = (targetCount: number) => {
  const calls: unknown[][] = [];
  let cb: () => Promise<void> = () => {
    throw new Error("Not initialized");
  };
  return {
    ready: (...args: unknown[]) => {
      calls.push(args)
      if (calls.length == targetCount) {
        cb();
      }
    },
    get count() {
      return calls.length;
    },
    calls,
    promise: new Promise<void>((resolve) => {
      cb = resolve as () => Promise<void>;
    }),
  };
};