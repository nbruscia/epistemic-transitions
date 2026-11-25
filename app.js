(() => {
  'use strict';
  const seed = [
    ['t1','Knowledge & Expertise','Architectural knowledge, methods of inquiry, design reasoning, representation, and the expertise required to conceive and evaluate the built environment.'],
    ['t2','Resources & Ecology',"Architecture's relationships with materials, energy, land, ecological systems, and the environmental consequences of building."],
    ['t3','Labor & Production','The human skills, technologies, organizations, and processes through which buildings are designed, manufactured, constructed, and maintained.'],
    ['t4','Habitation & Society',"The spatial organization of human habitation, including housing, accessibility, collective life, and architecture's relationship to social needs."],
    ['t5','Culture & Identity','Architecture as an expression and transmission of cultural knowledge, memory, identity, and situated building traditions.'],
    ['t6','Agency & Practice','The professional, institutional, political, and ethical responsibilities through which architects participate in shaping the built environment.']
  ].map(([id,label,detail])=>({id,label,detail,type:'transformation'}));
  const inventory=window.EpistemicInventory||[];
  const fixedNodes=[...seed,...inventory];
  const initialEdges=inventory.flatMap(n=>n.domains.map(domain=>({from:domain,to:n.id,seeded:true})));
  const fixedIds=new Set(fixedNodes.map(n=>n.id));
  // Retain the historical internal type for compatibility with existing workshop
  // exports and Firebase records. Only these six IDs are fixed domains.
  const domainIds=new Set(seed.map(n=>n.id));
  const displayType=n=>n&&domainIds.has(n.id)?'Domain':n?.type==='transformation'?'Legacy transformation':({condition:'Transition',implication:'Educational implication',response:'Proposed response'}[n?.type]||'');
  const colors = {transformation:'#466c79', condition:'#b9874b', implication:'#8188a8', response:'#528d73'};
  const $ = id => document.getElementById(id);
  const svg = $('graph'), NS='http://www.w3.org/2000/svg';
  const storageKey='epistemic-transitions-local-v2';
  let local;
  try { local=JSON.parse(localStorage.getItem(storageKey)); } catch {}
  if (!local || !Array.isArray(local.nodes) || !Array.isArray(local.edges)) local={nodes:[],edges:[]};
  local.nodes=[...fixedNodes,...local.nodes.filter(n=>!fixedIds.has(n.id))];
  local.edges=[...initialEdges,...local.edges.filter(e=>!initialEdges.some(s=>(s.from===e.from&&s.to===e.to)||(s.from===e.to&&s.to===e.from)))];
  let data=local, mode='organic', selected=null, positions={}, dragging=null, shared=null, session='';
  let visibility='domains', statusFilter='all';
  const d3Renderer=window.EpistemicD3?new window.EpistemicD3(svg,id=>{selected=id;refresh();}):null;
  const status=document.querySelector('header .status');
  const toolbar=document.querySelector('.tools');
  const sessionButton=document.createElement('button');
  sessionButton.className='secondary'; sessionButton.textContent='Join shared session';
  toolbar.prepend(sessionButton);
  const showStatus=(message,isError=false)=>{status.style.display='block';status.textContent=(isError?'Error · ':'')+message;status.style.color=isError?'#202020':'#505050';};
  const graphvizRenderer=window.EpistemicGraphviz
    ?new window.EpistemicGraphviz(document.querySelector('.graph-area'),id=>{selected=id;refresh();},err=>showStatus('Graphviz: '+err.message,true))
    :null;
  const nodeBy=id=>data.nodes.find(n=>n.id===id);
  const saveLocal=()=>localStorage.setItem(storageKey,JSON.stringify(local));
  const nodeValid=n=>n&&typeof n.id==='string'&&typeof n.label==='string'&&colors[n.type];
  const statusField=document.createElement('div');statusField.className='field';statusField.hidden=true;
  statusField.innerHTML='<label for="new-status">Transition status (provisional)</label><select id="new-status"><option value="observed">Observed</option><option value="emerging" selected>Emerging</option><option value="anticipated">Anticipated</option></select>';
  $('kind').closest('.field').after(statusField);
  $('kind').addEventListener('change',()=>{statusField.hidden=$('kind').value!=='condition';});
  const visibleGraph=()=>{
    const nodes=data.nodes.filter(n=>{
      if(visibility==='domains')return domainIds.has(n.id);
      if(visibility==='transitions'&&!domainIds.has(n.id)&&n.type!=='condition')return false;
      if(n.type==='condition'&&statusFilter!=='all'&&n.status!==statusFilter)return false;
      return true;
    });
    const ids=new Set(nodes.map(n=>n.id));
    return {nodes,edges:data.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};
  };

  function populate(id) {
    const select=$(id),old=select.value;
    select.replaceChildren();
    data.nodes.forEach(n=>{const option=document.createElement('option');option.value=n.id;option.textContent=n.label;select.append(option);});
    if ([...select.options].some(o=>o.value===old)) select.value=old;
    else if(id==='parent'&&inventory.length)select.value=inventory[0].id;
  }
  function refresh() {
    ['parent','source','target'].forEach(populate);
    $('count-nodes').textContent=data.nodes.length;
    $('count-links').textContent=data.edges.length;
    const card=$('selected-card');card.replaceChildren();
    const n=nodeBy(selected);
    const badge=document.createElement('span');badge.className='pill';badge.textContent=n?displayType(n):'Select a node';
    const title=document.createElement('h3');title.textContent=n?n.label:'Explore a perspective';
    const detail=document.createElement('p');detail.textContent=n?(n.detail||'No description supplied.'):'Click any node in the network to inspect its description and connected ideas.';
    card.append(badge,title,detail);
    if(n?.status){const status=document.createElement('p');status.textContent='Status: '+n.status.charAt(0).toUpperCase()+n.status.slice(1)+' (provisional)';card.append(status);}
    if(n){const related=document.createElement('p');related.textContent='Connected to: '+(data.edges.filter(e=>e.from===n.id||e.to===n.id).map(e=>nodeBy(e.from===n.id?e.to:e.from)?.label).filter(Boolean).join(', ')||'None yet');card.append(related);}
    $('restore').disabled=Boolean(shared);$('clear').disabled=Boolean(shared);
    draw();
  }
  function measure(){const rect=svg.getBoundingClientRect();return {w:Math.max(340,rect.width),h:Math.max(320,rect.height)};}
  function initPositions(){const{w,h}=measure();data.nodes.forEach((n,i)=>{if(!positions[n.id]){const angle=i*2.39996,r=n.type==='transformation'?Math.min(w,h)*.30:Math.min(w,h)*.17+Math.sqrt(i)*14;positions[n.id]={x:w/2+Math.cos(angle)*r,y:h/2+Math.sin(angle)*r,vx:0,vy:0};}});}
  function layout(){initPositions();const{w,h}=measure();
    if(mode==='structured'){
      const groups={transformation:[],condition:[],implication:[],response:[]};data.nodes.forEach(n=>groups[n.type].push(n));
      Object.entries(groups).forEach(([type,arr],column)=>arr.forEach((n,i)=>{const p=positions[n.id];p.x+=(w*(column+.5)/4-p.x)*.13;p.y+=(h*(i+1)/(arr.length+1)-p.y)*.13;}));return;
    }
    for(let i=0;i<data.nodes.length;i++)for(let j=i+1;j<data.nodes.length;j++){
      const a=positions[data.nodes[i].id],b=positions[data.nodes[j].id];const dx=a.x-b.x,dy=a.y-b.y,d=Math.max(5,Math.hypot(dx,dy)),f=3200/(d*d);a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;
    }
    data.edges.forEach(e=>{const a=positions[e.from],b=positions[e.to];if(!a||!b)return;const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-145)*.004;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;});
    data.nodes.forEach(n=>{const p=positions[n.id];if(n.id===dragging)return;p.vx=(p.vx+(w/2-p.x)*.0007)*.83;p.vy=(p.vy+(h/2-p.y)*.0007)*.83;p.x=Math.max(52,Math.min(w-52,p.x+p.vx));p.y=Math.max(52,Math.min(h-52,p.y+p.vy));});
  }
  function shape(tag,attrs={},text){const element=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))element.setAttribute(k,v);if(text!==undefined)element.textContent=text;return element;}
  function draw(){
    const graph=visibleGraph();
    if(mode!=='organic'&&graphvizRenderer){
      svg.style.display='none';d3Renderer?.simulation.stop();graphvizRenderer.show();
      graphvizRenderer.update(graph,mode,selected);return;
    }
    graphvizRenderer?.hide();svg.style.display='block';
    if(d3Renderer){d3Renderer.update(graph,'organic',selected);return;}
    const{w,h}=measure();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.replaceChildren();
    data.edges.forEach(e=>{const a=positions[e.from],b=positions[e.to];if(a&&b)svg.append(shape('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge'+(e.secondary?' secondary':'')}));});
    data.nodes.forEach(n=>{const p=positions[n.id];if(!p)return;const root=n.type==='transformation',r=root?35:24;
      const group=shape('g',{class:'node '+(root?'root':'idea')+(selected===n.id?' selected':''),transform:`translate(${p.x} ${p.y})`,tabindex:'0',role:'button','aria-label':n.label});
      group.append(shape('circle',{r,fill:root?colors.transformation:'#fff',stroke:colors[n.type]}));
      if(root){const lines=[];let line='';n.label.split(' ').forEach(word=>{if((line+' '+word).trim().length>12&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();});if(line)lines.push(line);lines.slice(0,3).forEach((s,i)=>group.append(shape('text',{y:(i-(Math.min(3,lines.length)-1)/2)*12+4},s)));}
      else{group.append(shape('circle',{r:7,fill:colors[n.type]}));group.append(shape('text',{y:r+15},n.label.length>25?n.label.slice(0,24)+'…':n.label));}
      group.addEventListener('click',()=>{selected=n.id;refresh();});group.addEventListener('keydown',e=>{if(e.key==='Enter'){selected=n.id;refresh();}});
      // Select on pointerdown: the SVG is redrawn every frame, so a later
      // synthetic click can be lost when its original DOM target is replaced.
      group.addEventListener('pointerdown',e=>{
        dragging=n.id;
        svg.setPointerCapture(e.pointerId);
        selected=n.id;
        refresh();
      });
      svg.append(group);
    });
  }
  svg.addEventListener('pointermove',e=>{if(!dragging)return;const rect=svg.getBoundingClientRect(),{w,h}=measure();const p=positions[dragging];if(p){p.x=(e.clientX-rect.left)*w/rect.width;p.y=(e.clientY-rect.top)*h/rect.height;}});
  svg.addEventListener('pointerup',()=>dragging=null);svg.addEventListener('pointercancel',()=>dragging=null);
  function tick(){if(d3Renderer)return;layout();draw();requestAnimationFrame(tick);}

  const mergeRemote=remote=>{
    const nodes=[...fixedNodes,...remote.nodes.filter(n=>nodeValid(n)&&!fixedIds.has(n.id))];
    const ids=new Set(nodes.map(n=>n.id));
    const edges=[...initialEdges,...remote.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)&&!initialEdges.some(s=>(s.from===e.from&&s.to===e.to)||(s.from===e.to&&s.to===e.from)))];
    data={nodes,edges};if(selected&&!ids.has(selected))selected=null;refresh();
  };
  async function join(){
    if(shared){shared.disconnect();shared=null;data=local;session='';sessionButton.textContent='Join shared session';showStatus('● Browser-local session');refresh();return;}
    const entry=prompt('Workshop session ID (3–40 lowercase letters, digits, hyphens):','pilot-2026');
    if(entry===null)return;
    const id=entry.trim().toLowerCase();sessionButton.disabled=true;showStatus('Connecting to Firestore…');
    try{
      const {connectWorkshop}=await import('./firebase-collaboration.js');
      const connection=await connectWorkshop(id,mergeRemote,err=>showStatus('Firestore: '+err.message,true));
      shared=connection;session=id;sessionButton.textContent='Leave shared session';showStatus('● Shared session: '+id);
      $('timeline').textContent='Shared session '+id+'. The six domains are fixed; contributions and connections synchronize between browsers. Existing entries are immutable; export the graph for a record.';
    }catch(err){showStatus('Connection failed: '+err.message,true);alert('Could not join the shared session: '+err.message+'\n\nPlease check the Firestore rules and Firebase configuration.');}
    finally{sessionButton.disabled=false;refresh();}
  }
  sessionButton.addEventListener('click',join);
  $('idea-form').addEventListener('submit',async e=>{
    e.preventDefault();const type=$('kind').value,label=$('label').value.trim(),detail=$('detail').value.trim(),parent=$('parent').value;
    if(!label)return;
    if(!['condition','implication','response'].includes(type))return alert('The six domains are fixed. Please select a contribution type.');
    const button=e.currentTarget.querySelector('button');button.disabled=true;
    try{
      if(shared){const id=await shared.addNode({type,label,detail,status:type==='condition'?$('new-status').value:undefined});
        if(parent)await shared.addEdge(parent,id);
        showStatus('● Contribution added to '+session+'.');
      }else{
        const id='n'+crypto.randomUUID();local.nodes.push({id,label,detail,type,status:type==='condition'?$('new-status').value:undefined});
        if(parent)local.edges.push({from:parent,to:id});selected=id;saveLocal();refresh();
      }
      $('label').value='';$('detail').value='';
    }catch(err){alert('Contribution was not saved: '+err.message);}finally{button.disabled=false;}
  });
  $('link').addEventListener('click',async()=>{
    const from=$('source').value,to=$('target').value;if(from===to)return alert('Choose different nodes.');
    if(data.edges.some(e=>(e.from===from&&e.to===to)||(e.from===to&&e.to===from)))return alert('These nodes are already connected.');
    try{if(shared)await shared.addEdge(from,to);else{local.edges.push({from,to,secondary:true});saveLocal();refresh();}}catch(err){alert('Connection was not saved: '+err.message);}
  });
  const modes=[['organic','Organic','Organic network'],['structured','Hierarchy','Hierarchical interpretation'],['clustered','Clustered','Clustered interpretation']];
  const modeMap={organic:'organic',structured:'dot',clustered:'sfdp'};
  const toggle=document.querySelector('.toggle');
  const statusLegend=document.createElement('div');statusLegend.className='status-legend';
  statusLegend.innerHTML='<span><i class="status-symbol observed"></i>Observed</span><span><i class="status-symbol emerging"></i>Emerging</span><span><i class="status-symbol anticipated"></i>Anticipated</span><span class="status-note">Transition statuses are provisional</span>';
  document.querySelector('.legend').after(statusLegend);
  const filterBar=document.createElement('div');filterBar.className='network-filters';
  filterBar.innerHTML='<label for="visibility-filter">Show</label><select id="visibility-filter" aria-label="Network visibility"><option value="domains" selected>Domains only</option><option value="transitions">Domains + Transitions</option><option value="all">Complete network</option></select><label for="status-filter">Transition status</label><select id="status-filter" aria-label="Filter transition status"><option value="all">All statuses</option><option value="observed">Observed</option><option value="emerging">Emerging</option><option value="anticipated">Anticipated</option></select>';
  document.querySelector('.toolbar').after(filterBar);
  $('visibility-filter').addEventListener('change',e=>{visibility=e.target.value;refresh();});
  $('status-filter').addEventListener('change',e=>{statusFilter=e.target.value;refresh();});
  $('structured').textContent='Hierarchy';
  const clusteredButton=document.createElement('button');clusteredButton.id='clustered';clusteredButton.textContent='Clustered';toggle.append(clusteredButton);
  const graphZoom=document.createElement('div');graphZoom.className='graphviz-zoom-controls';graphZoom.hidden=true;
  graphZoom.innerHTML='<button type="button" class="secondary" aria-label="Zoom in" title="Zoom in">+</button><button type="button" class="secondary" aria-label="Zoom out" title="Zoom out">−</button><button type="button" class="secondary" aria-label="Fit graph" title="Reset zoom">Fit</button>';
  document.querySelector('.graph-area').append(graphZoom);
  const zoomButtons=graphZoom.querySelectorAll('button');
  zoomButtons[0].addEventListener('click',()=>graphvizRenderer?.zoomBy(1.3));
  zoomButtons[1].addEventListener('click',()=>graphvizRenderer?.zoomBy(1/1.3));
  zoomButtons[2].addEventListener('click',()=>graphvizRenderer?.resetZoom());
  for(const[id,,title]of modes)$(id).addEventListener('click',()=>{
    const next=modeMap[id];const wasOrganic=mode==='organic';mode=next;
    for(const[button]of modes)$(button).classList.toggle('active',button===id);
    $('view-title').textContent=title;
    $('reset-view').style.display=next==='organic'?'':'none';
    graphZoom.hidden=next==='organic';
    if(next==='organic'&&!wasOrganic)d3Renderer?.simulation.alpha(.35).restart();
    refresh();
  });
  $('reset-view').onclick=()=>{if(d3Renderer)d3Renderer.reset();else{positions={};initPositions();}};
  const download=(name,content,mime)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
  $('export-json').onclick=()=>download('epistemic-transitions.json',JSON.stringify(data,null,2),'application/json');
  $('export-dot').onclick=()=>{const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,' ');download('epistemic-transitions.dot',['digraph EpistemicTransitions {','  graph [overlap=false, splines=true];','  node [style=filled, fontname="Helvetica"];',...data.nodes.map(n=>`  "${escape(n.id)}" [label="${escape(n.label)}", fillcolor="${colors[n.type]}", fontcolor="white"];`),...data.edges.map(e=>`  "${escape(e.from)}" -> "${escape(e.to)}";`),'}'].join('\n'),'text/vnd.graphviz');};
  $('export-svg').onclick=()=>{const current=mode!=='organic'?graphvizRenderer?.getSVG():svg;if(!current)return alert('Please wait for the layout to finish.');const copy=current.cloneNode(true);copy.setAttribute('xmlns',NS);download('epistemic-transitions.svg',new XMLSerializer().serializeToString(copy),'image/svg+xml');};
  $('import-json').onclick=()=>shared?alert('Leave the shared session before importing a local graph.'):$('import-file').click();
  $('import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const p=JSON.parse(await f.text());if(!Array.isArray(p.nodes)||!Array.isArray(p.edges)||!p.nodes.every(nodeValid))throw Error('Invalid graph format');local={nodes:[...fixedNodes,...p.nodes.filter(n=>!fixedIds.has(n.id))],edges:[...initialEdges,...p.edges]};data=local;selected=null;positions={};saveLocal();refresh();}catch(err){alert(err.message);}e.target.value='';};
  $('restore').onclick=()=>{if(shared)return;if(confirm('Restore the six domains and initial transition inventory?')){local={nodes:[...fixedNodes],edges:[...initialEdges]};data=local;positions={};selected=null;saveLocal();refresh();}};
  $('clear').onclick=()=>{if(shared)return;if(confirm('Remove all contributed nodes and connections? The fixed inventory will remain.')){local={nodes:[...fixedNodes],edges:[...initialEdges]};data=local;positions={};selected=null;saveLocal();refresh();}};
  window.addEventListener('resize',()=>positions={});
  initPositions();refresh();tick();
})();
