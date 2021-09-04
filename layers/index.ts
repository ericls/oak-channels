import { Consumer } from "../consumer.ts";

export abstract class Layer {
  abstract groupJoin: (consumer: Consumer, groupName: string) => Promise<void>;
  abstract groupLeave: (consumer: Consumer, groupName: string) => Promise<void>;
  abstract groupSend: (
    groupName: string,
    message: string | Uint8Array,
  ) => Promise<void>;
}
