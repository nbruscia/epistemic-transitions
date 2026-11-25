// On-demand Graphviz layouts. Uses a browser-local WebAssembly engine;
// switching views never changes node or edge records in Firebase.
(function () {
  const palette = {transformation:'#202020',condition:'#ffffff',implication:'#ffffff',response:'#ffffff'};
  const actionColor='#c21870';
  const engines = new Set(['dot','twopi','sfdp']);
  const quote = value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ')+'"';
  // Graphviz recognizes a single DOT \n escape as a line break. Keep that
  // escape intact for labels while escaping user-entered backslashes safely.
  const quoteLabel = value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,'\\n')+'"';
  const wrapLabel=(value,max)=>{
    const words=String(value||'').trim().split(/\s+/).filter(Boolean);
    const lines=[];let line='';
    for(const word of words){
      if(line&&(`${line} ${word}`).length>max){lines.push(line);line=word;}
      else line=line?`${line} ${word}`:word;
    }
    if(line)lines.push(line);
    return lines.join('\n');
  };

  class EpistemicGraphviz {
    constructor(container,onSelect,onError) {
      this.onSelect=onSelect;this.onError=onError;
      this.layer=document.createElement('div');
      this.layer.className='graphviz-layer';
      this.layer.hidden=true;
      this.layer.addEventListener('click',event=>{
        if(!event.target.closest('g.node'))this.onSelect(null);
      });
      container.append(this.layer);
      this.graphvizPromise=null;this.lastSignature='';this.currentEngine='dot';this.token=0;
      this.zoom=null;this.zoomRoot=null;
    }
    show(){this.layer.hidden=false;}
    hide(){this.layer.hidden=true;this.token++;if(!this.getSVG())this.lastSignature='';}
    zoomBy(factor){
      const svg=this.getSVG();
      if(svg&&this.zoom&&window.d3)window.d3.select(svg).transition().duration(180).call(this.zoom.scaleBy,factor);
    }
    resetZoom(){
      const svg=this.getSVG();
      if(svg&&this.zoom&&window.d3)window.d3.select(svg).transition().duration(220).call(this.zoom.transform,window.d3.zoomIdentity);
    }
    async load(){
      if(!this.graphvizPromise){
        this.graphvizPromise=import('https://cdn.jsdelivr.net/npm/@hpcc-js/wasm-graphviz@1.13.0/dist/index.js')
          .then(module=>module.Graphviz.load());
      }
      return this.graphvizPromise;
    }
    dotSource(data,engine){
      const directed=engine==='dot';
      const connector=directed?'->':'--';
      const lines=[
        `${directed?'digraph':'graph'} EpistemicTransitions {`,
        'graph [bgcolor="transparent", pad="0.30", nodesep="0.44", ranksep="0.90", overlap="false", outputorder="edgesfirst", splines="true", rankdir="LR"];',
        'node [shape="circle", style="filled", fontname="Arial", fontsize="11", penwidth="1.25", margin="0.10,0.10", color="#202020"];',
        'edge [color="#777777", penwidth="0.85", arrowsize="0.50"];'
      ];
      if(engine==='twopi')lines.push('graph [root="t1", ranksep="1.7"];');
      if(engine==='sfdp')lines.push('graph [K="1.1", repulsiveforce="1.5", overlap="prism"];');
      for(const node of data.nodes){
        const root=node.type==='transformation';
        const label=wrapLabel(node.label,root?14:26);
        const attrs=[
          `label=${quoteLabel(root?label:'')}`,
          `fillcolor=${quote(palette[node.type]||'#ffffff')}`,
          `fontcolor=${quote(root?'#ffffff':'#202020')}`,
          `color=${quote(node.type==='response'?actionColor:'#202020')}`,
          `id=${quote('g-'+node.id)}`,
          `width=${root?'1.30':'0.42'}`,
          `height=${root?'1.30':'0.42'}`
        ];
        if(!root){attrs.push('fixedsize="true"',`xlabel=${quoteLabel(label)}`);}
        if(node.type==='condition'){
          if(node.status==='observed')attrs.push('peripheries="2"');
          if(node.status==='anticipated')attrs.push('style="filled,dashed"');
        }
        if(node.type==='implication')attrs.push('style="filled,dashed"');
        lines.push(`${quote(node.id)} [${attrs.join(', ')}];`);
      }
      const ids=new Set(data.nodes.map(n=>n.id));
      for(const edge of data.edges){
        if(ids.has(edge.from)&&ids.has(edge.to)&&edge.from!==edge.to){
          const action=data.nodes.some(n=>(n.id===edge.from||n.id===edge.to)&&n.type==='response');
          lines.push(`${quote(edge.from)} ${connector} ${quote(edge.to)}${action?' [color="'+actionColor+'", penwidth="1.7"]':''};`);
        }
      }
      lines.push('}');
      return lines.join('\n');
    }
    select(id){
      const linked=new Set(id?[id]:[]);
      for(const edge of this.edges||[]){
        if(edge.from===id)linked.add(edge.to);
        if(edge.to===id)linked.add(edge.from);
      }
      this.layer.querySelectorAll('g.node').forEach(group=>{
        const title=group.querySelector('title');
        const nodeId=title?.textContent;
        group.classList.toggle('selected',Boolean(id&&nodeId===id));
        group.classList.toggle('focus-dim',Boolean(id&&!linked.has(nodeId)));
      });
      this.layer.querySelectorAll('g.edge').forEach(group=>{
        const title=group.querySelector('title')?.textContent||'';
        const touching=Boolean(id&&(title.startsWith(id+'->')||title.endsWith('->'+id)||title.startsWith(id+'--')||title.endsWith('--'+id)));
        group.classList.toggle('focus-linked',touching);
        group.classList.toggle('focus-dim',Boolean(id&&!touching));
      });
    }
    async update(data,engine,selected){
      if(!engines.has(engine))return;
      this.selected=selected;
      this.edges=data.edges;
      this.currentEngine=engine;
      const signature=engine+'|'+data.nodes.map(n=>n.id+':'+n.label+':'+n.type+':'+n.status+':'+(n.reinforcements||0)+':'+(n.questions||0)).join('|')+'|'+data.edges.map(e=>e.from+'>'+e.to).join('|');
      if(signature===this.lastSignature){this.select(selected);return;}
      this.lastSignature=signature;
      const token=++this.token;
      this.layer.textContent='Calculating '+({dot:'hierarchical',twopi:'radial',sfdp:'clustered'}[engine])+' layout…';
      try{
        const graphviz=await this.load();
        const svgSource=graphviz.layout(this.dotSource(data,engine),'svg',engine);
        if(token!==this.token)return;
        const parsed=new DOMParser().parseFromString(svgSource,'image/svg+xml');
        if(parsed.querySelector('parsererror'))throw new Error('Graphviz produced invalid SVG.');
        const svg=document.importNode(parsed.documentElement,true);
        // The SVG was generated from our own DOT schema, but reject active content.
        svg.querySelectorAll('script,foreignObject').forEach(node=>node.remove());
        svg.querySelectorAll('*').forEach(node=>{for(const attribute of [...node.attributes])if(/^on/i.test(attribute.name))node.removeAttribute(attribute.name);});
        svg.removeAttribute('width');svg.removeAttribute('height');
        svg.setAttribute('role','img');svg.setAttribute('aria-label',engine+' Graphviz layout');
        // Zoom the outer wrapper, retaining Graphviz's own internal transform.
        const graph=svg.querySelector('g.graph');
        if(graph&&window.d3){
          const wrapper=document.createElementNS('http://www.w3.org/2000/svg','g');
          wrapper.setAttribute('class','graphviz-zoom-content');
          graph.parentNode.insertBefore(wrapper,graph);
          wrapper.appendChild(graph);
          this.zoomRoot=wrapper;
          this.zoom=window.d3.zoom().scaleExtent([.45,8]).on('zoom',event=>{
            if(this.zoomRoot===wrapper)wrapper.setAttribute('transform',event.transform.toString());
          });
          window.d3.select(svg).call(this.zoom).on('dblclick.zoom',null);
        }
        this.layer.replaceChildren(svg);
        const typeById=new Map(data.nodes.map(node=>[node.id,node.type]));
        const nodeById=new Map(data.nodes.map(node=>[node.id,node]));
        this.layer.querySelectorAll('g.node').forEach(group=>{
          const title=group.querySelector('title');
          const id=title?.textContent;
          if(!id)return;
          group.classList.add(typeById.get(id)||'condition');
          if(typeById.get(id)!=='transformation')group.querySelectorAll('text').forEach(label=>label.setAttribute('dy','5'));
          const node=nodeById.get(id),shape=group.querySelector('ellipse');
          if(node&&shape&&(node.reinforcements||node.questions)){
            const cx=Number(shape.getAttribute('cx')),cy=Number(shape.getAttribute('cy')),
              rx=Number(shape.getAttribute('rx')),ry=Number(shape.getAttribute('ry'));
            for(const [kind,count,side] of [['reinforce',node.reinforcements,1],['question',node.questions,-1]]){
              if(!count)continue;
              const mark=document.createElementNS('http://www.w3.org/2000/svg','g');
              mark.setAttribute('class','reaction-marker '+kind);
              mark.setAttribute('transform',`translate(${cx+side*(rx+5)} ${cy-ry-4})`);
              const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
              circle.setAttribute('r','9');circle.setAttribute('fill',kind==='reinforce'?'#202020':'#eeeeee');
              circle.setAttribute('stroke',kind==='reinforce'?'#202020':'#555555');
              const label=document.createElementNS('http://www.w3.org/2000/svg','text');
              label.setAttribute('dy','3.5');label.setAttribute('text-anchor','middle');
              label.setAttribute('fill',kind==='reinforce'?'#fff':'#333');
              label.setAttribute('font-size','10');label.textContent=kind==='reinforce'?String(count):'?';
              mark.append(circle,label);group.append(mark);
            }
          }
          group.setAttribute('role','button');group.setAttribute('tabindex','0');group.style.cursor='pointer';
          group.addEventListener('click',()=>this.onSelect(id));
          group.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.onSelect(id);}});
        });
        const responseIds=new Set(data.nodes.filter(n=>n.type==='response').map(n=>n.id));
        const responseEdges=new Set(data.edges.filter(e=>responseIds.has(e.from)||responseIds.has(e.to)).flatMap(e=>[e.from+'->'+e.to,e.from+'--'+e.to]));
        this.layer.querySelectorAll('g.edge').forEach(group=>group.classList.toggle('response-link',responseEdges.has(group.querySelector('title')?.textContent)));
        this.select(this.selected);
      }catch(error){
        if(token!==this.token)return;
        this.layer.textContent='Graphviz layout unavailable. Please switch to Organic and retry.';
        this.lastSignature='';this.onError(error);
      }
    }
    getSVG(){return this.layer.querySelector('svg');}
  }
  window.EpistemicGraphviz=EpistemicGraphviz;
})();
