import { Layer } from "./index.ts";
import { Consumer } from "../consumer.ts";
import { ConsumerGroupMap } from "./utils.ts"


export class InMemoryLayer extends Layer {
  consumerGroupMap = new ConsumerGroupMap();
  // deno-lint-ignore require-await
  groupJoin = async (consumer: Consumer, groupName: string) => {
    this.consumerGroupMap.join(consumer, groupName);
  };
  // deno-lint-ignore require-await
  groupLeave = async (consumer: Consumer, groupName: string) => {
    this.consumerGroupMap.leave(consumer, groupName);
  };
  groupSend = async (groupName: string, message: string | Uint8Array) => {
    for (const consumer of this.consumerGroupMap.getConsumers(groupName)) {
      await consumer.onGroupMessage(groupName, message);
    }
  };
  removeConsumer = async (consumer: Consumer) => {
    const groups = this.consumerGroupMap.consumerToGroups.get(consumer);
    if (!groups) return;
    for (const group of groups) {
      await this.groupLeave(consumer, group)
    }
  }
}
