// On-demand Graphviz layouts. Uses a browser-local WebAssembly engine;
// switching views never changes node or edge records in Firebase.
(function () {
  const palette = {transformation:'#466c79',condition:'#b9874b',implication:'#8188a8',response:'#528d73'};
  const engines = new Set(['dot','twopi','sfdp']);
  const quote = value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ')+'"';

  class EpistemicGraphviz {
    constructor(container,onSelect,onError) {
      this.onSelect=onSelect;this.onError=onError;
      this.layer=document.createElement('div');
      this.layer.className='graphviz-layer';
      this.layer.hidden=true;
      container.append(this.layer);
      this.graphvizPromise=null;this.lastSignature='';this.currentEngine='dot';this.token=0;
    }
    show(){this.layer.hidden=false;}
    hide(){this.layer.hidden=true;this.token++;if(!this.getSVG())this.lastSignature='';}
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
        'node [shape="box", style="rounded,filled", fontname="Arial", fontsize="12", fontcolor="white", penwidth="0", margin="0.18,0.12"];',
        'edge [color="#9DB2AC", penwidth="1.15", arrowsize="0.55"];'
      ];
      if(engine==='twopi')lines.push('graph [root="t1", ranksep="1.7"];');
      if(engine==='sfdp')lines.push('graph [K="1.1", repulsiveforce="1.5", overlap="prism"];');
      for(const node of data.nodes){
        const label=String(node.label||'').trim().replace(/(.{22})\s+/g,'$1\\n');
        lines.push(`${quote(node.id)} [label=${quote(label)}, fillcolor=${quote(palette[node.type]||'#466c79')}, id=${quote('g-'+node.id)}];`);
      }
      const ids=new Set(data.nodes.map(n=>n.id));
      for(const edge of data.edges){
        if(ids.has(edge.from)&&ids.has(edge.to)&&edge.from!==edge.to)
          lines.push(`${quote(edge.from)} ${connector} ${quote(edge.to)};`);
      }
      lines.push('}');
      return lines.join('\n');
    }
    select(id){
      this.layer.querySelectorAll('g.node').forEach(group=>{
        const title=group.querySelector('title');
        group.classList.toggle('selected',Boolean(title&&title.textContent===id));
      });
    }
    async update(data,engine,selected){
      if(!engines.has(engine))return;
      this.selected=selected;
      this.currentEngine=engine;
      const signature=engine+'|'+data.nodes.map(n=>n.id+':'+n.label+':'+n.type).join('|')+'|'+data.edges.map(e=>e.from+'>'+e.to).join('|');
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
        this.layer.replaceChildren(svg);
        this.layer.querySelectorAll('g.node').forEach(group=>{
          const title=group.querySelector('title');
          const id=title?.textContent;
          if(!id)return;
          group.setAttribute('role','button');group.setAttribute('tabindex','0');group.style.cursor='pointer';
          group.addEventListener('click',()=>this.onSelect(id));
          group.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.onSelect(id);}});
        });
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
