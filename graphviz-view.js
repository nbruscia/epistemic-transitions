// On-demand Graphviz layouts. Uses a browser-local WebAssembly engine;
// switching views never changes node or edge records in Firebase.
(function () {
  const palette = {transformation:'#202020',condition:'#ffffff',implication:'#ffffff',response:'#d1d1d1'};
  const engines = new Set(['dot','twopi','sfdp']);
  const quote = value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ')+'"';

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
        'node [shape="circle", style="filled", fontname="Arial", fontsize="11", penwidth="1.25", margin="0.10,0.10", color="#202020"];',
        'edge [color="#777777", penwidth="0.85", arrowsize="0.50"];'
      ];
      if(engine==='twopi')lines.push('graph [root="t1", ranksep="1.7"];');
      if(engine==='sfdp')lines.push('graph [K="1.1", repulsiveforce="1.5", overlap="prism"];');
      for(const node of data.nodes){
        const root=node.type==='transformation';
        const label=String(node.label||'').trim().replace(/(.{16})\s+/g,'$1\\n');
        const attrs=[
          `label=${quote(root?label:'')}`,
          `fillcolor=${quote(palette[node.type]||'#ffffff')}`,
          `fontcolor=${quote(root?'#ffffff':'#202020')}`,
          `color="#202020"`,
          `id=${quote('g-'+node.id)}`,
          `width=${root?'1.30':'0.42'}`,
          `height=${root?'1.30':'0.42'}`
        ];
        if(!root){attrs.push('fixedsize="true"',`xlabel=${quote(label)}`);}
        if(node.type==='implication')attrs.push('style="filled,dashed"');
        lines.push(`${quote(node.id)} [${attrs.join(', ')}];`);
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
