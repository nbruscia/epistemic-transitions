/* D3-powered hybrid network renderer. Keeps DOM nodes stable across simulation
   ticks, unlike the original redraw-every-frame prototype. */
(function () {
  if (!window.d3) return;
  const d3 = window.d3;
  const palette = {transformation:'#202020',condition:'#ffffff',implication:'#ffffff',response:'#ffffff'};
  const actionColor='#c21870';

  class EpistemicD3 {
    constructor(svgElement, onSelect) {
      this.svg=d3.select(svgElement);
      this.onSelect=onSelect;
      this.viewport=this.svg.append('g').attr('class','d3-viewport');
      this.linksLayer=this.viewport.append('g').attr('class','d3-links');
      this.nodesLayer=this.viewport.append('g').attr('class','d3-nodes');
      this.nodesById=new Map();
      this.signature='';
      this.mode='organic';
      this.selected=null;
      this.simulation=d3.forceSimulation([])
        .force('link',d3.forceLink([]).id(d=>d.id).distance(d=>d.source.type==='transformation'?135:165).strength(.35))
        .force('charge',d3.forceManyBody().strength(d=>d.type==='transformation'?-490:-270))
        .force('collision',d3.forceCollide().radius(d=>d.type==='transformation'?56:37).iterations(2))
        .velocityDecay(.42)
        .alphaDecay(.045)
        .on('tick',()=>this.tick());
      this.zoom=d3.zoom().scaleExtent([.35,3.4]).on('zoom',event=>this.viewport.attr('transform',event.transform));
      this.svg.call(this.zoom).on('dblclick.zoom',null);
      // A click anywhere outside a node clears the focus, restoring the
      // original network contrast. Node clicks retain their own selection.
      this.svg.on('click.clear-selection',event=>{
        if(!event.target.closest('g.node'))this.onSelect(null);
      });
      this.resizeObserver=new ResizeObserver(()=>this.resize());
      this.resizeObserver.observe(svgElement);
      this.resize();
    }

    dimensions() {
      const rect=this.svg.node().getBoundingClientRect();
      return {w:Math.max(350,rect.width),h:Math.max(320,rect.height)};
    }

    resize() {
      const{w,h}=this.dimensions();this.width=w;this.height=h;
      this.svg.attr('viewBox',`0 0 ${w} ${h}`);
      this.installForces();this.simulation.alpha(.3).restart();
    }

    installForces() {
      if(!this.width)return;
      const roots=this.simulation.nodes().filter(n=>n.type==='transformation');
      const rootIndex=new Map(roots.map((n,i)=>[n.id,i]));
      const target=(n,axis)=>{
        if(this.mode==='structured'){
          const columns={transformation:0,condition:1,implication:2,response:3};
          const col=columns[n.type]??1;
          if(axis==='x')return this.width*(col+.5)/4;
          const same=this.simulation.nodes().filter(x=>x.type===n.type);
          return this.height*(same.findIndex(x=>x.id===n.id)+1)/(same.length+1);
        }
        if(n.type==='transformation'){
          const i=rootIndex.get(n.id)||0,angle=(i/Math.max(roots.length,1))*Math.PI*2-Math.PI/2;
          const r=Math.min(this.width,this.height)*.29;
          return(axis==='x'?this.width/2+Math.cos(angle)*r:this.height/2+Math.sin(angle)*r);
        }
        return axis==='x'?this.width/2:this.height/2;
      };
      this.simulation
        .force('x',d3.forceX(n=>target(n,'x')).strength(n=>this.mode==='structured'?.36:n.type==='transformation'?.09:.012))
        .force('y',d3.forceY(n=>target(n,'y')).strength(n=>this.mode==='structured'?.30:n.type==='transformation'?.09:.012));
      this.simulation.force('link').strength(this.mode==='structured'?.08:.35);
    }

    update(data, mode, selected) {
      this.selected=selected;
      this.applyFocus();
      const edgeKey=e=>`${e.id||''}:${e.from}:${e.to}`;
      const signature=mode+'|'+data.nodes.map(n=>`${n.id}:${n.label}:${n.type}:${n.status}:${n.reinforcements||0}:${n.questions||0}`).join('|')+'|'+data.edges.map(edgeKey).join('|');
      if(signature===this.signature)return;
      const changedMode=this.mode!==mode;
      this.signature=signature;this.mode=mode;
      const old=this.nodesById;
      const nodes=data.nodes.map(n=>{
        const existing=old.get(n.id);
        return existing?Object.assign(existing,n):{...n,x:this.width/2+(Math.random()-.5)*110,y:this.height/2+(Math.random()-.5)*110};
      });
      this.nodesById=new Map(nodes.map(n=>[n.id,n]));
      if(changedMode)nodes.forEach(n=>{n.fx=null;n.fy=null;});
      const edges=data.edges.filter(e=>this.nodesById.has(e.from)&&this.nodesById.has(e.to)).map(e=>({id:edgeKey(e),source:e.from,target:e.to,secondary:!!e.secondary}));
      const edgeSelection=this.linksLayer.selectAll('line.edge').data(edges,d=>d.id)
        .join(enter=>enter.append('line').attr('class','edge'),update=>update,exit=>exit.remove())
        .classed('secondary',d=>d.secondary)
        .classed('response-link',d=>[d.source,d.target].some(endpoint=>this.nodesById.get(endpoint.id||endpoint)?.type==='response'));
      const nodeSelection=this.nodesLayer.selectAll('g.node').data(nodes,d=>d.id).join(
        enter=>{
          const g=enter.append('g').attr('class',d=>'node '+(d.type==='transformation'?'root':'idea'))
            .attr('role','button').attr('tabindex',0)
            .on('pointerdown',(event,d)=>{event.stopPropagation();this.onSelect(d.id);})
            .on('keydown',(event,d)=>{if(event.key==='Enter'){event.preventDefault();this.onSelect(d.id);}});
          g.append('circle').attr('class','main-circle');
          g.append('circle').attr('class','inner-circle');
          g.append('text').attr('class','node-label');
          for(const kind of ['reinforcement','question']){
            const marker=g.append('g').attr('class','reaction-marker '+kind).attr('pointer-events','none');
            marker.append('circle').attr('r',9);
            marker.append('text').attr('dy','3.5').attr('text-anchor','middle');
          }
          g.call(d3.drag()
            .on('start',(event,d)=>{this.onSelect(d.id);if(!event.active)this.simulation.alphaTarget(.25).restart();d.fx=d.x;d.fy=d.y;})
            .on('drag',(event,d)=>{d.fx=event.x;d.fy=event.y;})
            .on('end',(event,d)=>{
              if(!event.active)this.simulation.alphaTarget(0);
              // Dragging is temporary in the faculty workshop: release the
              // node back into the force-directed network on pointer-up.
              d.fx=null;d.fy=null;
            }));
          return g;
        },update=>update,exit=>exit.remove()
      );
      nodeSelection
        .attr('aria-label',d=>d.label)
        .classed('selected',d=>d.id===selected)
        .classed('root',d=>d.type==='transformation')
        .classed('idea',d=>d.type!=='transformation')
        .classed('response',d=>d.type==='response');
      nodeSelection.select('.main-circle').attr('r',d=>d.type==='transformation'?42:20)
        .attr('fill',d=>palette[d.type]).attr('stroke',d=>d.type==='response'?actionColor:'#202020')
        .attr('stroke-width',d=>d.type==='transformation'?1.4:1.3)
        .attr('stroke-dasharray',d=>d.type==='condition'&&d.status==='anticipated'?'4 3':d.type==='implication'?'3 3':null);
      nodeSelection.select('.inner-circle')
        .attr('r',d=>d.type==='condition'&&d.status==='observed'?16:0)
        .attr('fill','none').attr('stroke','#202020')
        .attr('stroke-width',1.3);
      nodeSelection.select('.node-label').each(function(d){
        const text=d3.select(this);text.selectAll('*').remove();
        if(d.type!=='transformation'){
          text.attr('y',40).attr('fill','#202020').text(d.label.length>29?d.label.slice(0,28)+'…':d.label);return;
        }
        text.attr('fill','#ffffff').text(null);
        const words=d.label.split(' '),lines=[];let current='';
        words.forEach(word=>{if((current+' '+word).trim().length>12&&current){lines.push(current);current=word;}else current=(current+' '+word).trim();});
        if(current)lines.push(current);
        lines.slice(0,3).forEach((line,i)=>text.append('tspan').attr('x',0).attr('y',(i-(Math.min(lines.length,3)-1)/2)*12+4).text(line));
      });
      nodeSelection.select('.reaction-marker.reinforcement')
        .attr('display',d=>d.reinforcements?'':'none')
        .attr('transform',d=>`translate(${d.type==='transformation'?33:18},${d.type==='transformation'?-33:-18})`)
        .each(function(d){const mark=d3.select(this);mark.select('circle').attr('fill','#202020');mark.select('text').attr('fill','#fff').text(d.reinforcements||'');});
      nodeSelection.select('.reaction-marker.question')
        .attr('display',d=>d.questions?'':'none')
        .attr('transform',d=>`translate(${d.type==='transformation'?-33:-18},${d.type==='transformation'?-33:-18})`)
        .each(function(d){const mark=d3.select(this);mark.select('circle').attr('fill','#eee').attr('stroke','#555');mark.select('text').attr('fill','#333').text('?');});
      this.edgeSelection=edgeSelection;this.nodeSelection=nodeSelection;
      this.simulation.nodes(nodes);
      this.simulation.force('link').links(edges);
      this.installForces();
      this.simulation.alpha(.9).restart();
      this.applyFocus();
      this.tick();
    }

    applyFocus(){
      if(!this.nodeSelection)return;
      const id=this.selected;
      const linked=new Set(id?[id]:[]);
      if(id)for(const edge of this.simulation.force('link').links()){
        const from=edge.source?.id||edge.source,to=edge.target?.id||edge.target;
        if(from===id)linked.add(to);
        if(to===id)linked.add(from);
      }
      this.nodeSelection.classed('selected',d=>d.id===id)
        .classed('focus-dim',d=>Boolean(id)&&!linked.has(d.id));
      if(this.edgeSelection)this.edgeSelection
        .classed('focus-linked',d=>Boolean(id)&&((d.source?.id||d.source)===id||(d.target?.id||d.target)===id))
        .classed('focus-dim',d=>Boolean(id)&&((d.source?.id||d.source)!==id&&(d.target?.id||d.target)!==id));
    }

    tick() {
      if(this.edgeSelection)this.edgeSelection
        .attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
        .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
      if(this.nodeSelection)this.nodeSelection.attr('transform',d=>`translate(${d.x||0} ${d.y||0})`);
    }

    reset() {
      this.simulation.nodes().forEach(n=>{n.fx=null;n.fy=null;});
      this.svg.transition().duration(350).call(this.zoom.transform,d3.zoomIdentity);
      this.simulation.alpha(.85).restart();
    }
  }
  window.EpistemicD3=EpistemicD3;
})();
