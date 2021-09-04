import { Layer } from "./index.ts";
import { Consumer } from "../consumer.ts";

// const IN_MEMORY_CHANNEL_MAP = {}

class ConsumerGroupMap {
  consumerToGroups = new WeakMap<Consumer, string[]>();
  groupToConsumers = new Map<string, Consumer[]>();
  getConsumers = (group: string) => {
    return this.groupToConsumers.get(group) || [];
  };
  join = (consumer: Consumer, group: string) => {
    if (this.consumerToGroups.has(consumer)) {
      this.consumerToGroups.get(consumer)?.push(group);
    } else {
      this.consumerToGroups.set(consumer, [group]);
    }
    if (this.groupToConsumers.has(group)) {
      this.groupToConsumers.get(group)?.push(consumer);
    } else {
      this.groupToConsumers.set(group, [consumer]);
    }
  };
  leave = (consumer: Consumer, group: string) => {
    const groups = this.consumerToGroups.get(consumer);
    const gIndex = groups?.indexOf(group);
    if (gIndex !== undefined && gIndex > -1) {
      groups?.splice(gIndex, 1);
    }
    const consumers = this.groupToConsumers.get(group);
    const cIndex = consumers?.indexOf(consumer);
    if (cIndex !== undefined && cIndex > -1) {
      consumers?.splice(cIndex, 1);
    }
  };
}

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
}
