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
    subgraph Processing[Processing...]
    C -- Start processing --> D[UPDATING]
    C --> J[DELAYED]
    end

    J -- Start processing --> D
    J -- Delay timeout --> H

    subgraph s2[Intermediate or end state]
    D -- Processing Failed --> H[ERROR]
    H -- Retry Processing --> D
    end

    subgraph s3[End state]
    C --> E[SKIPPED]
    D -- Complete with warnings --> I[WARNING]
    D -- Processing completed successfully --> G[UPDATED]
    end

    %% Coloring and styling
    style A fill:#e0e0e0,stroke:#888,color:#000000
    style B fill:#e0e0e0,stroke:#888,color:#000000
    style C fill:#e0e0e0,stroke:#66ff66,stroke-width:2px,color:#000000
    style D fill:#66ff66,stroke:#0b0,stroke-width:4px,stroke-dasharray: 6 2,color:#000000
    style J fill:#ffd580,stroke:#ff9900,color:#000000
    style H fill:#ffcccc,stroke:#c22,color:#000000
    style G fill:#ccffcc,stroke:#292,color:#000000
    style I fill:#ffeb99,stroke:#f90,color:#000000
    style E fill:#ffeb99,stroke:#f90,color:#000000
    style Processing fill:white,color:#666,font-weight:bold
    style s2 fill:white,color:#666,font-weight:bold
    style s3 fill:white,color:#666,font-weight:bold
```

### State Behavior

#### Status Cascading
When `cascadeOnStatusChange` is enabled in settings:
- Status changes propagate up to parent containers
- Container nodes recalculate their status based on child node states

## Edge States

Edge states represent the current status of connections between nodes in the flow diagram.

### State Definitions

| State | Category | Description |
|-------|:----------:|-------------|
| `INACTIVE` | Initial | Edge is not active, connection exists but no data flow |
| `ACTIVE` | Process | Edge is actively transferring data between nodes |
| `COMPLETED` | End state | Data transfer completed successfully |
| `FAILED` | End state | Data transfer failed or connection error |
| `BLOCKED` | Process | Edge is blocked, waiting for conditions to be met |

### State Transitions

```mermaid
flowchart TD
    A[INACTIVE] --> B[ACTIVE]
    A --> E[BLOCKED]
    
    subgraph Active Processing
    B -- Data transfer successful --> C[COMPLETED]
    B -- Data transfer failed --> D[FAILED]
    B -- Conditions not met --> E
    end
    
    E -- Conditions met --> B
    E -- Timeout/Cancel --> D
    
    C --> A
    D --> A
    
    %% Coloring and styling
    style A fill:#e0e0e0,stroke:#888
    style B fill:#66ff66,stroke:#0b0,stroke-width:4px,stroke-dasharray: 6 2
    style E fill:#ffd580,stroke:#ff9900
    style C fill:#ccffcc,stroke:#292
    style D fill:#ffcccc,stroke:#c22
```

### State Behavior

#### Edge Status Based on Connected Nodes
Edge states are typically derived from the states of their connected nodes:
- If source node is `UPDATING` and target node is `READY`, edge becomes `ACTIVE`
- If source node is `UPDATED` and data successfully transferred, edge becomes `COMPLETED`
- If either source or target node has `ERROR` state, edge may become `FAILED`
- If source node is `DELAYED`, edge may become `BLOCKED`

#### Visual Representation
Edge states affect their visual appearance:
- `INACTIVE`: Dashed or gray line
- `ACTIVE`: Solid, animated line with flow indicators
- `COMPLETED`: Solid line with completion marker
- `FAILED`: Red or error-colored line
- `BLOCKED`: Orange or warning-colored line

#### Edge State Propagation
Edge states can influence connected nodes:
- Multiple `FAILED` edges may trigger source node to enter `ERROR` state
- `BLOCKED` edges may cause target node to remain in `READY` state
- `ACTIVE` edges indicate data flow in progress between `UPDATING` nodes
