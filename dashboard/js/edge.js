import BaseEdge from "./edgeBase.js";
import BaseContainerNode from "./nodeBaseContainer.js";

export function createInternalEdge(edgeData, source, target, settings)
{
    // Defensive: ensure valid node instances
    if (!source || !target) {
      console.error("createInternalEdge: Source or Target node is missing", {
        edgeData,
        source,
        target
      });
      return;
    }
    if ( source === target) {
      console.error("createInternalEdge - Source and Target are the same node", source);
      return;
    }
    const parents = buildEdgeParents(source, target);

    const parent = parents.container;
    
    // Defensive check: ensure we have a valid parent container
    if (!parent) {
      console.error("createInternalEdge: No common parent container found for edge", {
        source: source.data.label,
        target: target.data.label,
        sourceParents: parents.source?.map(p => p.data?.label || p.id) || [],
        targetParents: parents.target?.map(p => p.data?.label || p.id) || []
      });
      return;
    }
    
    if (!parent.childEdges) {
      console.error("createInternalEdge: Parent container does not have childEdges array", {
        parent: parent,
        parentType: parent.constructor?.name,
        parentId: parent.id
      });
      return;
    }

    if (source.edges.outgoing.find((edge) => edge.target === target)) {
      return;
    }
    // create edge
    const edge = new BaseEdge(edgeData, parents, settings);

    // add edge to source and target
    source.edges.outgoing.push(edge);
    target.edges.incoming.push(edge);

    // add edge to parent, for continued layout adjustments
    parent.childEdges.push(edge);

}

// this function returns an object with the following structure:
// parents: {
//   source: [], // list of parent nodes for source, where element 0 is the direct parent, the last element is the element before the container
//   target: [], // list of parent nodes for target, where element 0 is the direct parent, the last element is the element before the container
//   container: null // the joint parent container node for source and target
// }
export function buildEdgeParents(sourceNode, targetNode) {
  const sourceParents = [sourceNode, ...sourceNode.getParents()];
  const targetParents = [targetNode, ...targetNode.getParents()];

  let container = null;

  // Use a Set for efficient lookup and determine the container
  const targetParentSet = new Set(targetParents);
  for (let i = 0; i < sourceParents.length; i++) {
    if (targetParentSet.has(sourceParents[i])) {
      container = sourceParents[i];
      break;
    }
  }

  const prunedSourceParents = sourceParents.slice(0, sourceParents.indexOf(container));
  const prunedTargetParents = targetParents.slice(0, targetParents.indexOf(container));

  return {
    source: prunedSourceParents,
    target: prunedTargetParents,
    container: container
  };
}



export function createEdge(rootNode, edgeData, settings)
{
    var sourceId = typeof edgeData.source === 'string' ? edgeData.source : edgeData.source.id;
    var targetId = typeof edgeData.target === 'string' ? edgeData.target : edgeData.target.id;

    const source = rootNode.getNode(sourceId);
    if (!source) {
      console.error(`   Creating Edge - Source node ${sourceId} not found`,edgeData);
      return;
    }

    // find target
    const target = rootNode.getNode(targetId);
    if (!target) {
      console.error(`   Creating Edge - Target node ${targetId} not found`);
      return;
    }

    createInternalEdge(edgeData, source, target, settings)
}


export  function createEdges(rootNode, edges, settings) {
  // Normalize edges to ensure they use numeric source/target IDs only
  const normalizedEdges = edges.map(edgeData => {
    // Create a clean edge object with only the properties we need
    const normalized = {
      source: edgeData.source,  // Use numeric ID
      target: edgeData.target,  // Use numeric ID
      label: edgeData.label || '',
      description: edgeData.description || '',
      type: edgeData.type || 'unknown',
      isActive: edgeData.isActive !== false
    };
    
    // Explicitly ignore sourceName and targetName
    // Only use the numeric source and target properties
    if (typeof normalized.source !== 'number') {
      console.error('Edge has invalid source (not a number):', edgeData);
      return null;
    }
    if (typeof normalized.target !== 'number') {
      console.error('Edge has invalid target (not a number):', edgeData);
      return null;
    }
    
    return normalized;
  }).filter(edge => edge !== null);

  // Continue with existing edge creation logic using normalizedEdges
  normalizedEdges.forEach(edgeData => {
    const sourceNode = rootNode.getNode(edgeData.source);
    const targetNode = rootNode.getNode(edgeData.target);
    
    if (!sourceNode) {
      console.error('Creating Edge - Source node', edgeData.source, 'not found', edgeData);
      return;
    }
    if (!targetNode) {
      console.error('Creating Edge - Target node', edgeData.target, 'not found', edgeData);
      return;
    }
    
    createInternalEdge(edgeData, sourceNode, targetNode, settings);
  });

   rootNode.initEdges(true);
}