export function createMarkers(container) {
  const defs = container.append('defs');

  defs
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('class', 'marker arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 4)
    .attr('markerHeight', 4)
    .attr('xoverflow', 'visible')
    .append('svg:path')
    .attr('class', 'marker-arrow')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5');

  defs
    .append('marker')
    .attr('id', 'arrow')
    .attr('class', 'marker arrow')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('orient', 'auto-start-reverse')
    .attr('markerWidth', 4)
    .attr('markerHeight', 4)
    .attr('xoverflow', 'visible')
    .append('svg:path')
    .attr('class', 'marker-arrowhead')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5');

  defs
    .append('marker')
    .attr('id', 'mid-arrow')
    .attr('class', 'marker arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 5)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 4)
    .attr('markerHeight', 4)
    .attr('xoverflow', 'visible')
    .append('svg:path')
    .attr('class', 'marker-arrowhead')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5');

  // defs
  //   .append("marker")
  //     .attr("id","arrow")
  //     .attr("viewBox","0 0 10 10")
  //     .attr("refX","5")
  //     .attr("refY","5")
  //     .attr("markerWidth","6")
  //     .attr("markerHeight","6")
  //     .attr("orient","auto-start-reverse")
  //     .attr("d","M 0 0 L 10 5 L 0 10 z");

  defs
    .append('marker')

    .attr('class', 'marker circle')
    .attr('viewBox', '-7 -7 14 14')
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 4)
    .attr('markerHeight', 4)
    .attr('xoverflow', 'visible')
    .append('circle')
    .attr('class', 'marker-circle')
    // https://www.w3.org/TR/SVG2/painting.html#LineJoin
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 5);

  defs
    .append('marker')
    .attr('id', 'circle')
    .attr('class', 'marker circle')
    .attr('viewBox', '-5 -5 10 10')
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 4)
    .attr('markerHeight', 4)
    .attr('xoverflow', 'visible')
    .append('circle')
    .attr('class', 'marker-diamond')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 5);

  defs
    .append('marker')
    .attr('id', 'halfcircle')
    .attr('class', 'marker circle')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 4)
    .attr('markerHeight', 4)
    .attr('xoverflow', 'visible')
    .append('circle')
    .attr('class', 'marker-square')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 5);

  const circle_arrow = defs
    .append('marker')
    .attr('id', 'circlearrow')
    .attr('class', 'marker circlearrow')
    .attr('viewBox', '0 -10 15 20')
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('xoverflow', 'visible');

  circle_arrow
    .append('circle')
    .attr('class', 'marker-diamond')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 7);

  circle_arrow.append('svg:path').attr('class', 'marker-arrow').attr('d', 'M 0,-5 L 20 ,0 L 0,5');

  // Status-indicator templates. Each node that opts in via
  // settings.showCenterMark / settings.showConnectionPoints emits a
  // <use href="#…"> instead of building the markup from scratch — the
  // browser shares geometry across instances, and we keep one source of
  // truth for the indicator's shape.
  //
  // CSS rules target the .centermark / .connection-point class on the
  // <use> element; SVG fill/stroke inheritance carries the styling into
  // the symbol's shadow content automatically.
  defs
    .append('symbol')
    .attr('id', 'flowdash-centermark-template')
    .attr('overflow', 'visible')
    .append('circle')
    .attr('r', 3)
    .attr('cx', 0)
    .attr('cy', 0);

  defs
    .append('symbol')
    .attr('id', 'flowdash-connection-point-template')
    .attr('overflow', 'visible')
    .append('circle')
    .attr('r', 2)
    .attr('cx', 0)
    .attr('cy', 0);
}
