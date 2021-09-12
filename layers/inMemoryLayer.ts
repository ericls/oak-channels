import { Layer } from "./index.ts";
import { Consumer } from "../consumer.ts";

class ConsumerGroupMap {
  consumerToGroups = new WeakMap<Consumer, string[]>();
  groupToConsumers = new Map<string, WeakRef<Consumer>[]>();
  getConsumers = (group: string): Consumer[] => {
    const isConsumer = (
      maybeConsumer: Consumer | undefined,
    ): maybeConsumer is Consumer => {
      return !!maybeConsumer;
    };
    return (this.groupToConsumers.get(group) || []).map((ref) => ref.deref())
      .filter(isConsumer);
  };
  join = (consumer: Consumer, group: string) => {
    if (this.consumerToGroups.has(consumer)) {
      this.consumerToGroups.get(consumer)?.push(group);
    } else {
      this.consumerToGroups.set(consumer, [group]);
    }
    if (this.groupToConsumers.has(group)) {
      this.groupToConsumers.get(group)?.push(new WeakRef(consumer));
    } else {
      this.groupToConsumers.set(group, [new WeakRef(consumer)]);
    }
  };
  leave = (consumer: Consumer, group: string) => {
    const groups = this.consumerToGroups.get(consumer);
    const gIndex = groups?.indexOf(group);
    if (gIndex !== undefined && gIndex > -1) {
      groups?.splice(gIndex, 1);
    }
    const consumers = this.groupToConsumers.get(group);
    const cIndex = consumers?.findIndex((ref) => ref.deref() === consumer);
    if (cIndex !== undefined && cIndex > -1) {
      consumers?.splice(cIndex, 1);
    }
    this.removeEmptyRefs();
  };
  private removeEmptyRefs = () => {
    for (const [k, v] of this.groupToConsumers.entries()) {
      this.groupToConsumers.set(k, v.filter((ref) => ref.deref()));
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
  removeConsumer = async (consumer: Consumer) => {
    const groups = this.consumerGroupMap.consumerToGroups.get(consumer);
    if (!groups) return;
    for (const group of groups) {
      await this.groupLeave(consumer, group)
    }
  }
}
