# 14_status — Status state machine

Drives every transition of the `NodeStatus` enum and exercises the cascade and auto-collapse rules. See [`/dashboard/documentation/state.md`](../dashboard/documentation/state.md).

| Demo                                           | Purpose                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`01_basic/basic.html`](./01_basic/basic.html) | A 3-step pipeline; toggle each step's status, observe the parent cascade. Switch cascade and auto-collapse settings live. |
