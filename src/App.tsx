import { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Trash2, Download, X, DollarSign, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';

interface TimeEntry { id:string; project:string; description:string; startTime:number; endTime:number|null; rate:number; }
interface Project { id:string; name:string; color:string; rate:number; }

const COLORS=['#ec4899','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#22c55e'];
const SAVE_E='tc_entries_v1'; const SAVE_P='tc_projects_v1';
const loadE=():TimeEntry[]=>{try{return JSON.parse(localStorage.getItem(SAVE_E)||'[]')}catch{return[]}};
const loadP=():Project[]=>{try{return JSON.parse(localStorage.getItem(SAVE_P)||'[{"id":"default","name":"General","color":"#ec4899","rate":50}]')}catch{return[{id:'default',name:'General',color:'#ec4899',rate:50}]}};
const fmtDur=(ms:number)=>{const h=Math.floor(ms/3600000);const m=Math.floor((ms%3600000)/60000);const s=Math.floor((ms%60000)/1000);return h>0?`${h}h ${m}m`:`${m}m ${s}s`;};

export default function App() {
  const [entries,setEntries]=useState<TimeEntry[]>(loadE);
  const [projects,setProjects]=useState<Project[]>(loadP);
  const [active,setActive]=useState<TimeEntry|null>(()=>loadE().find(e=>!e.endTime)||null);
  const [tick,setTick]=useState(0);
  const [selProject,setSelProject]=useState(loadP()[0]?.id||'default');
  const [desc,setDesc]=useState('');
  const [tab,setTab]=useState<'timer'|'log'|'report'>('timer');
  const [showNewProject,setShowNewProject]=useState(false);

  useEffect(()=>{if(active){const i=setInterval(()=>setTick(t=>t+1),1000);return()=>clearInterval(i);}}, [active]);

  const saveE=(e:TimeEntry[])=>{setEntries(e);localStorage.setItem(SAVE_E,JSON.stringify(e))};
  const saveP=(p:Project[])=>{setProjects(p);localStorage.setItem(SAVE_P,JSON.stringify(p))};

  const startTimer=()=>{
    const entry:TimeEntry={id:crypto.randomUUID(),project:selProject,description:desc.trim(),startTime:Date.now(),endTime:null,rate:projects.find(p=>p.id===selProject)?.rate||0};
    setActive(entry); setEntries(prev=>[entry,...prev]); saveE([entry,...entries]);
  };

  const stopTimer=()=>{
    if(!active)return;
    const updated=entries.map(e=>e.id===active.id?{...e,endTime:Date.now()}:e);
    saveE(updated); setActive(null); setDesc('');
  };

  const getEarnings=(e:TimeEntry)=>{
    const dur=(e.endTime||Date.now())-e.startTime;
    return (dur/3600000)*e.rate;
  };

  const totalEarnings=entries.filter(e=>e.endTime).reduce((s,e)=>s+getEarnings(e),0);
  const totalHours=entries.filter(e=>e.endTime).reduce((s,e)=>s+((e.endTime!-e.startTime)/3600000),0);

  const exportCSV=()=>{
    const header='Date,Project,Description,Duration(h),Rate,Earnings';
    const rows=entries.filter(e=>e.endTime).map(e=>{
      const dur=((e.endTime!-e.startTime)/3600000);
      const proj=projects.find(p=>p.id===e.project)?.name||e.project;
      return [format(new Date(e.startTime),'yyyy-MM-dd'),proj,e.description,dur.toFixed(2),e.rate,(dur*e.rate).toFixed(2)].join(',');
    });
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([[header,...rows].join('\n')],{type:'text/csv'}));a.download='timeclock-report.csv';a.click();
  };

  const proj=projects.find(p=>p.id===selProject);
  const activeDur=active?Date.now()-active.startTime:0;

  return (
    <div style={{minHeight:'100vh',background:'#080808',display:'flex',flexDirection:'column'}}>
      <header style={{padding:'16px 20px',borderBottom:'1px solid #2d0a1e',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,#ec4899,#be185d)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px #ec489930'}}><Clock size={16} color="white"/></div>
          <div><div style={{fontWeight:'700',fontSize:'16px',color:'white',lineHeight:1}}>TimeClock Pro</div>
          <div style={{fontSize:'11px',color:'#831843',marginTop:'2px'}}>{totalHours.toFixed(1)}h logged · ${totalEarnings.toFixed(2)} earned</div></div>
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          <button onClick={exportCSV} style={{padding:'7px',borderRadius:'7px',background:'none',border:'none',cursor:'pointer',color:'#831843'}}><Download size={15}/></button>
          {(['timer','log','report'] as const).map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'5px 10px',borderRadius:'7px',background:tab===t?'#ec489920':'none',border:`1px solid ${tab===t?'#ec4899':'transparent'}`,color:tab===t?'#f9a8d4':'#831843',fontSize:'11px',cursor:'pointer',fontFamily:'Inter',textTransform:'capitalize'}}>{t}</button>)}
        </div>
      </header>

      {tab==='timer'&&(
        <div style={{flex:1,overflow:'auto',padding:'20px'}}>
          {/* Big timer */}
          <div style={{textAlign:'center',marginBottom:'24px',padding:'32px 20px',background:active?'#2d0a1e':'#120608',border:`1px solid ${active?'#ec489940':'#2d0a1e'}`,borderRadius:'20px',transition:'all 0.3s'}}>
            <div style={{fontSize:'52px',fontWeight:'700',color:active?'#f9a8d4':'white',fontVariantNumeric:'tabular-nums',marginBottom:'8px',letterSpacing:'2px',fontFamily:'monospace'}}>
              {fmtDur(activeDur)}
            </div>
            {active&&<div style={{color:'#ec4899',fontSize:'13px',marginBottom:'16px'}}>{active.description||projects.find(p=>p.id===active.project)?.name||'Tracking...'}</div>}
          </div>

          {/* Project selector */}
          {!active&&(
            <div style={{display:'flex',gap:'6px',overflowX:'auto',marginBottom:'12px',paddingBottom:'2px'}}>
              {projects.map(p=><button key={p.id} onClick={()=>setSelProject(p.id)} style={{flexShrink:0,display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',borderRadius:'20px',border:`1px solid ${selProject===p.id?p.color:'#2d0a1e'}`,background:selProject===p.id?p.color+'15':'transparent',color:selProject===p.id?p.color:'#831843',fontSize:'12px',cursor:'pointer',fontFamily:'Inter',whiteSpace:'nowrap'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color,flexShrink:0}}/>
                {p.name} · ${p.rate}/h
              </button>)}
              <button onClick={()=>setShowNewProject(true)} style={{flexShrink:0,display:'flex',alignItems:'center',gap:'4px',padding:'7px 12px',borderRadius:'20px',border:'1px dashed #2d0a1e',color:'#831843',fontSize:'12px',cursor:'pointer',fontFamily:'Inter'}}><Plus size={11}/>New</button>
            </div>
          )}

          {!active&&<input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What are you working on? (optional)" style={{width:'100%',background:'#120608',border:'1px solid #2d0a1e',borderRadius:'10px',padding:'12px 14px',color:'white',fontSize:'14px',outline:'none',fontFamily:'Inter',marginBottom:'12px'}} onFocus={e=>e.target.style.borderColor='#ec4899'} onBlur={e=>e.target.style.borderColor='#2d0a1e'}/>}

          <button onClick={active?stopTimer:startTimer} style={{width:'100%',padding:'18px',borderRadius:'14px',background:active?'#be185d':'#ec4899',border:'none',color:'white',fontSize:'16px',fontWeight:'700',cursor:'pointer',fontFamily:'Inter',boxShadow:`0 8px 24px ${active?'#be185d':'#ec4899'}40`,display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',transition:'all 0.2s'}}>
            {active?<><Square size={18}/> Stop Timer</>:<><Play size={18}/> Start Timer</>}
          </button>
        </div>
      )}

      {tab==='log'&&(
        <div style={{flex:1,overflow:'auto',padding:'12px 20px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {entries.filter(e=>e.endTime).length===0?(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'52px',marginBottom:'16px'}}>⏰</div>
              <p style={{color:'#831843',fontSize:'14px',lineHeight:'1.6'}}>Start the timer to log your first entry.</p>
            </div>
          ):[...entries].filter(e=>e.endTime).sort((a,b)=>b.startTime-a.startTime).map(e=>{
            const dur=e.endTime!-e.startTime;
            const p=projects.find(x=>x.id===e.project);
            return <div key={e.id} style={{background:'#120608',border:'1px solid #2d0a1e',borderRadius:'10px',padding:'12px 14px',display:'flex',alignItems:'center',gap:'10px',transition:'all 0.2s'}}
              onMouseEnter={el=>el.currentTarget.style.borderColor='#ec489930'} onMouseLeave={el=>el.currentTarget.style.borderColor='#2d0a1e'}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:p?.color||'#ec4899',flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'white',fontSize:'13px',fontWeight:'500',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.description||p?.name||'Work'}</div>
                <div style={{color:'#831843',fontSize:'11px',marginTop:'2px'}}>{format(new Date(e.startTime),'MMM d, h:mm a')} · {p?.name}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#f9a8d4'}}>{fmtDur(dur)}</div>
                <div style={{fontSize:'11px',color:'#831843'}}>${getEarnings(e).toFixed(2)}</div>
              </div>
              <button onClick={()=>saveE(entries.filter(x=>x.id!==e.id))} style={{padding:'4px',background:'none',border:'none',cursor:'pointer',color:'#831843'}}><Trash2 size={13}/></button>
            </div>;
          })}
        </div>
      )}

      {tab==='report'&&(
        <div style={{flex:1,overflow:'auto',padding:'16px 20px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {[{l:'Total Hours',v:totalHours.toFixed(1)+'h',c:'#ec4899'},{l:'Total Earned',v:'$'+totalEarnings.toFixed(2),c:'#f9a8d4'},{l:'Avg Rate',v:'$'+(totalHours>0?(totalEarnings/totalHours).toFixed(0):0)+'/h',c:'#fbcfe8'},{l:'Entries',v:String(entries.filter(e=>e.endTime).length),c:'#f472b6'}].map(s=>(
              <div key={s.l} style={{background:'#120608',border:'1px solid #2d0a1e',borderRadius:'12px',padding:'14px',textAlign:'center'}}>
                <div style={{fontSize:'20px',fontWeight:'700',color:s.c}}>{s.v}</div>
                <div style={{fontSize:'11px',color:'#831843',marginTop:'4px'}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* By project */}
          {projects.map(p=>{
            const pEntries=entries.filter(e=>e.project===p.id&&e.endTime);
            if(!pEntries.length)return null;
            const hrs=pEntries.reduce((s,e)=>s+((e.endTime!-e.startTime)/3600000),0);
            const earn=pEntries.reduce((s,e)=>s+getEarnings(e),0);
            return <div key={p.id} style={{background:'#120608',border:'1px solid #2d0a1e',borderRadius:'12px',padding:'14px',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:p.color}}/>
                <div>
                  <div style={{color:'white',fontSize:'13px',fontWeight:'500'}}>{p.name}</div>
                  <div style={{color:'#831843',fontSize:'11px'}}>{hrs.toFixed(1)}h · {pEntries.length} entries</div>
                </div>
              </div>
              <span style={{fontSize:'15px',fontWeight:'700',color:p.color}}>${earn.toFixed(2)}</span>
            </div>;
          })}
        </div>
      )}

      {showNewProject&&(
        <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:50,display:'flex',alignItems:'flex-end'}} onClick={e=>e.target===e.currentTarget&&setShowNewProject(false)}>
          <NewProjectForm onAdd={p=>{saveP([...projects,p]);setSelProject(p.id);setShowNewProject(false);}} onClose={()=>setShowNewProject(false)}/>
        </div>
      )}
    </div>
  );
}

function NewProjectForm({onAdd,onClose}:{onAdd:(p:Project)=>void;onClose:()=>void}) {
  const [name,setName]=useState('');
  const [color,setColor]=useState('#ec4899');
  const [rate,setRate]=useState('50');
  const inp={width:'100%',background:'#080808',border:'1px solid #2d0a1e',borderRadius:'10px',padding:'11px 14px',color:'white',fontSize:'14px',outline:'none',fontFamily:'Inter'};
  return (
    <div style={{width:'100%',background:'#120608',borderRadius:'20px 20px 0 0',border:'1px solid #2d0a1e',padding:'24px'}}>
      <div style={{width:'36px',height:'3px',background:'#2d0a1e',borderRadius:'2px',margin:'0 auto 20px'}}/>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'18px'}}>
        <h3 style={{color:'white',fontSize:'16px',fontWeight:'700',fontFamily:'Inter'}}>New Project</h3>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#831843'}}><X size={16}/></button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Project name *" style={inp} autoFocus onFocus={e=>e.target.style.borderColor='#ec4899'} onBlur={e=>e.target.style.borderColor='#2d0a1e'}/>
        <input type="number" value={rate} onChange={e=>setRate(e.target.value)} placeholder="Hourly rate ($)" style={inp} onFocus={e=>e.target.style.borderColor='#ec4899'} onBlur={e=>e.target.style.borderColor='#2d0a1e'}/>
        <div style={{display:'flex',gap:'6px'}}>
          {COLORS.map(c=><button key={c} onClick={()=>setColor(c)} style={{width:'28px',height:'28px',borderRadius:'50%',background:c,border:`2px solid ${color===c?'white':c+'60'}`,cursor:'pointer',transform:color===c?'scale(1.2)':'scale(1)',transition:'all 0.15s'}}/>)}
        </div>
        <button onClick={()=>{if(!name.trim())return;onAdd({id:crypto.randomUUID(),name:name.trim(),color,rate:parseFloat(rate)||50});}} disabled={!name.trim()} style={{padding:'14px',borderRadius:'12px',background:!name.trim()?'#2d0a1e':'#ec4899',border:'none',color:'white',fontSize:'15px',fontWeight:'700',cursor:!name.trim()?'not-allowed':'pointer',fontFamily:'Inter',opacity:!name.trim()?0.5:1}}>Create Project</button>
      </div>
    </div>
  );
}
