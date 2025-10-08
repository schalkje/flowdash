# State

## Node States

Node states are defined in the `NodeStatus` object and represent the current status of a node in the flow diagram.

### State Definitions

| State | Category | Description |
|-------|:----------:|-------------|
| `UNDETERMINED` | Initial | Node state has not been determined yet, there never has been any information about the dataset |
| `UNKNOWN` | Initial | Node state is unknown or not set |
| `READY` | Process | Node is ready to be processed |
| `UPDATING` | Process | Node is currently being updated/processed |
| `DELAYED` | Process | Node processing is delayed |
| `ERROR` | Process / End state | Node has encountered an error |
| `UPDATED` | End state | Node has been successfully updated |
| `SKIPPED` | End state | Node was skipped during processing |
| `WARNING` | End state | Node has a warning state |
| `DISABLED` | Inactive | Node is disabled and will not process |

### State Transitions

```mermaid
flowchart TD
    A[UNDETERMINED] --> B[UNKNOWN]

    B --> C[READY]
    subgraph Processing
    C -- Start processing --> D[UPDATING]
    C --> J[DELAYED]
    end

    J -- Start processing --> D
    J -- Delay timeout --> H

    subgraph Intermediate or end state
    D -- Processing Failed --> H[ERROR]
    H -- Retry Processing --> D
    end

    subgraph End state
    C --> E[SKIPPED]
    D -- Complete with warnings --> I[WARNING]
    D -- Processing completed successfully --> G[UPDATED]
    end

    %% Coloring and styling
    style A fill:#e0e0e0,stroke:#888
    style B fill:#e0e0e0,stroke:#888
    style C fill:#e0e0e0,stroke:#66ff66,stroke-width:2px
    style D fill:#66ff66,stroke:#0b0,stroke-width:4px,stroke-dasharray: 6 2
    style J fill:#ffd580,stroke:#ff9900
    style H fill:#ffcccc,stroke:#c22
    style G fill:#ccffcc,stroke:#292
    style I fill:#ffeb99,stroke:#f90
    style E fill:#ffeb99,stroke:#f90
```
### State Behavior

#### Status Cascading
When `cascadeOnStatusChange` is enabled in settings:
- Status changes propagate up to parent containers
- Container nodes recalculate their status based on child node states

## Edge States

_Documentation for edge states to be added._
