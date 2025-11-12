import { NodeStatus } from "./nodeBase.js";

// Status Manager for centralized status calculation and management
export class StatusManager {
  static calculateContainerStatus(childNodes, settings) {
    if (!settings.cascadeOnStatusChange || childNodes.length === 0) {
      return NodeStatus.UNKNOWN;
    }

    const collectLeafStatuses = (nodes, out) => {
      for (const n of nodes) {
        if (n.isContainer && Array.isArray(n.childNodes) && n.childNodes.length > 0) {
          collectLeafStatuses(n.childNodes, out);
        } else {
          out.push(n.status);
        }
      }
    };

    const statuses = [];
    collectLeafStatuses(childNodes, statuses);
    return this.determineAggregateStatus(statuses);
  }
  
  static determineAggregateStatus(statuses) {
    if (statuses.length === 0) {
      return NodeStatus.UNKNOWN;
    }
    
    // Special case: if children are only SKIPPED and/or UPDATED, return UPDATED
    const uniqueStatuses = [...new Set(statuses)];
    const onlySkippedAndUpdated = uniqueStatuses.every(s => 
      s === NodeStatus.SKIPPED || s === NodeStatus.UPDATED
    );
    if (onlySkippedAndUpdated && uniqueStatuses.length > 0) {
      return NodeStatus.UPDATED;
    }
    
    // Priority order: Error > Warning > Delayed > Unknown > Updating > Updated > Skipped > Ready
    const priority = [
      NodeStatus.ERROR,
      NodeStatus.WARNING,
      NodeStatus.DELAYED,
      NodeStatus.UNKNOWN,
      NodeStatus.UPDATING,
      NodeStatus.UPDATED,
      NodeStatus.SKIPPED,
      NodeStatus.READY
    ];
    
    for (const status of priority) {
      if (statuses.includes(status)) {
        return status;
      }
    }
    
    return NodeStatus.UNKNOWN;
  }
  
  static shouldCollapseOnStatus(status, settings) {
    if (!settings.toggleCollapseOnStatusChange) {
      return false;
    }
    
    return [NodeStatus.READY, NodeStatus.DISABLED, NodeStatus.UPDATED, NodeStatus.SKIPPED].includes(status);
  }
  
  /**
   * Determines if a container should collapse based on its children's statuses
   * Rules:
   * 1. Collapse when all non-disabled children share the same status
   * 2. Collapse when children are only SKIPPED and/or UPDATED (any combination)
   * 
   * @param {Array} childStatuses - Array of child node statuses
   * @param {Object} settings - Settings object
   * @returns {boolean} - True if container should collapse
   */
  static shouldContainerCollapse(childStatuses, settings) {
    if (!settings.toggleCollapseOnStatusChange || childStatuses.length === 0) {
      return false;
    }
    
    // Filter out DISABLED statuses
    const nonDisabledStatuses = childStatuses.filter(s => s !== NodeStatus.DISABLED);
    
    if (nonDisabledStatuses.length === 0) {
      return false; // All disabled, don't collapse
    }
    
    // Get unique statuses
    const uniqueStatuses = [...new Set(nonDisabledStatuses)];
    
    // Rule 1: All non-disabled children have the same status
    if (uniqueStatuses.length === 1) {
      return true;
    }
    
    // Rule 2: Children are only SKIPPED and/or UPDATED
    const onlySkippedAndUpdated = uniqueStatuses.every(s => 
      s === NodeStatus.SKIPPED || s === NodeStatus.UPDATED
    );
    
    return onlySkippedAndUpdated;
  }
  
  static getStatusPriority(status) {
    const priority = [
      NodeStatus.ERROR,
      NodeStatus.WARNING,
      NodeStatus.DELAYED,
      NodeStatus.UNKNOWN,
      NodeStatus.UPDATING,
      NodeStatus.UPDATED,
      NodeStatus.SKIPPED,
      NodeStatus.READY
    ];
    
    return priority.indexOf(status);
  }
  
  static isErrorStatus(status) {
    return [NodeStatus.ERROR, NodeStatus.WARNING, NodeStatus.DELAYED].includes(status);
  }
  
  static isProcessStatus(status) {
    return [NodeStatus.READY, NodeStatus.UPDATING, NodeStatus.UPDATED, NodeStatus.SKIPPED].includes(status);
  }
} 