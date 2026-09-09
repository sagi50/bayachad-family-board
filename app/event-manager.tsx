'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarPlus, Check, Clock3, LoaderCircle, MapPin, Pencil, Plus, Tag, Trash2, UserRound, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { apiFetch } from '@/lib/api';

type Person = 'sagi'|'maya'|'alma'|'liam';
type FamilyEvent = {id:string;title:string;topic:string;person:Person;location:string;event_date:string;event_time:string;updated_at:string;updated_by:string;version:number};
type EventsPayload = {events:FamilyEvent[];error?:string};
type Draft = {title:string;topic:string;person:Person;location:string;event_date:string;event_time:string};

const people:Record<Person,string>={sagi:'שגיא',maya:'מאיה',alma:'אלמה',liam:'ליאם'};
const months:Record<string,number>={ינואר:1,פברואר:2,מרץ:3,אפריל:4,מאי:5,יוני:6,יולי:7,אוגוסט:8,ספטמבר:9,אוקטובר:10,נובמבר:11,דצמבר:12};
const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
const blank=():Draft=>({title:'',topic:'',person:'sagi',location:'',event_date:todayKey(),event_time:''});
const eventDateLabel=(date:string)=>new Intl.DateTimeFormat('he-IL',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Jerusalem'}).format(new Date(date+'T12:00:00'));
const ownerClass=(name:string)=>name.includes('מאיה')?'maya':'sagi';

function displayedMonth(){
  const label=document.querySelector<HTMLElement>('.calendar-nav strong')?.textContent?.trim()||'';
  const year=Number(label.match(/\d{4}/)?.[0]);
  const monthName=Object.keys(months).find(name=>label.includes(name));
  return year&&monthName?{year,month:months[monthName]}:null;
}

function dateForDay(day:number){
  const current=displayedMonth();
  if(!current)return null;
  return `${current.year}-${String(current.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export default function EventManager(){
  const [buttonHost,setButtonHost]=useState<HTMLElement|null>(null);
  const [dayHost,setDayHost]=useState<HTMLElement|null>(null);
  const [boardHost,setBoardHost]=useState<HTMLElement|null>(null);
  const [events,setEvents]=useState<FamilyEvent[]>([]);
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [editing,setEditing]=useState<FamilyEvent|null>(null);
  const [editor,setEditor]=useState(false);
  const [draft,setDraft]=useState<Draft>(blank);
  const [deleting,setDeleting]=useState<FamilyEvent|null>(null);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    try{
      const response=await apiFetch('/api/events',{cache:'no-store'});
      const data=await response.json() as EventsPayload;
      if(!response.ok)throw new Error(data.error||'לא הצלחנו לטעון את האירועים.');
      setEvents(data.events);
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'לא הצלחנו לטעון את האירועים.');}
  },[]);

  const updateCalendar=useCallback(()=>{
    const introButton=document.querySelector<HTMLButtonElement>('.intro button.primary');
    if(introButton?.parentElement)setButtonHost(introButton.parentElement);

    const tabs=document.querySelector<HTMLElement>('.board-tabs');
    if(tabs){
      let host=tabs.querySelector<HTMLElement>(':scope > .family-events-board-host');
      if(!host){host=document.createElement('section');host.className='family-events-board-host';tabs.appendChild(host);}
      setBoardHost(host);
    }

    const calendar=document.querySelector<HTMLElement>('.calendar-card');
    if(calendar&&!calendar.dataset.eventsBound){
      calendar.dataset.eventsBound='1';
      calendar.addEventListener('click',(event)=>{
        const target=event.target as HTMLElement;
        const dayButton=target.closest<HTMLButtonElement>('.calendar-day');
        if(dayButton){
          const day=Number(dayButton.querySelector('.calendar-number')?.textContent||'0');
          const key=dateForDay(day);
          if(key)setSelectedDate(key);
        }
      });
    }

    const month=displayedMonth();
    const dates=month?new Set(events.filter(item=>item.event_date.startsWith(`${month.year}-${String(month.month).padStart(2,'0')}-`)).map(item=>item.event_date)):new Set<string>();
    document.querySelectorAll<HTMLButtonElement>('.calendar-day').forEach(button=>{
      const day=Number(button.querySelector('.calendar-number')?.textContent||'0');
      const key=dateForDay(day);
      const existing=button.querySelector<HTMLElement>(':scope > .event-black-dot');
      const shouldShow=!!key&&dates.has(key);
      if(shouldShow&&!existing){
        const dot=document.createElement('span');
        dot.className='event-black-dot';
        dot.setAttribute('aria-label','יש אירוע');
        button.appendChild(dot);
      }else if(!shouldShow&&existing){existing.remove();}
    });

    const popover=document.querySelector<HTMLElement>('.day-popover');
    if(popover&&selectedDate){
      let host=popover.querySelector<HTMLElement>(':scope > .family-events-day-host');
      if(!host){host=document.createElement('div');host.className='family-events-day-host';popover.appendChild(host);}
      setDayHost(host);
    }else setDayHost(null);
  },[events,selectedDate]);

  useEffect(()=>{load();const timer=setInterval(load,15000);const focus=()=>load();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus)}},[load]);
  useEffect(()=>{updateCalendar();const observer=new MutationObserver(updateCalendar);observer.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect()},[updateCalendar]);

  const selectedEvents=useMemo(()=>selectedDate?events.filter(item=>item.event_date===selectedDate):[],[events,selectedDate]);
  const listedEvents=useMemo(()=>[...events].sort((a,b)=>(a.event_date+a.event_time).localeCompare(b.event_date+b.event_time)),[events]);

  function openNew(){setEditing(null);setDraft({...blank(),event_date:selectedDate||todayKey()});setError('');setEditor(true)}
  function openEdit(item:FamilyEvent){setEditing(item);setDraft({title:item.title,topic:item.topic,person:item.person,location:item.location,event_date:item.event_date,event_time:item.event_time});setError('');setEditor(true)}

  async function save(event:React.FormEvent){
    event.preventDefault();if(saving||!draft.title.trim())return;setSaving(true);setError('');
    try{
      const response=await apiFetch('/api/events',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,...(editing?{id:editing.id,version:editing.version}:{})})});
      const data=await response.json() as {error?:string};
      if(!response.ok){if(response.status===409)await load();throw new Error(data.error||'לא הצלחנו לשמור את האירוע.');}
      setEditor(false);setEditing(null);setSelectedDate(draft.event_date);await load();
    }catch(e){setError(e instanceof Error?e.message:'לא הצלחנו לשמור את האירוע.');}
    finally{setSaving(false)}
  }

  async function remove(){
    if(!deleting||saving)return;setSaving(true);setError('');
    try{
      const response=await apiFetch('/api/events',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deleting.id,version:deleting.version})});
      const data=await response.json() as {error?:string};
      if(!response.ok){if(response.status===409)await load();throw new Error(data.error||'לא הצלחנו למחוק את האירוע.');}
      setDeleting(null);await load();
    }catch(e){setError(e instanceof Error?e.message:'לא הצלחנו למחוק את האירוע.');setDeleting(null)}
    finally{setSaving(false)}
  }

  const eventRow=(item:FamilyEvent,compact=false)=><div className={compact?'family-event-row compact':'family-event-row'} key={item.id}><span className={'family-event-owner '+ownerClass(item.updated_by)} title={`עודכן על ידי ${item.updated_by}`}/><div className="family-event-main"><strong>{item.title}</strong><div className="family-event-meta">{!compact&&<span><CalendarDays size={12}/>{eventDateLabel(item.event_date)}</span>}{item.event_time&&<span><Clock3 size={12}/>{item.event_time}</span>}<span><UserRound size={12}/>{people[item.person]}</span>{item.topic&&<span><Tag size={12}/>{item.topic}</span>}{item.location&&<span><MapPin size={12}/>{item.location}</span>}</div></div><div className="family-event-actions"><button type="button" onClick={()=>openEdit(item)} aria-label={`עריכת ${item.title}`}><Pencil size={15}/></button><button type="button" className="danger" onClick={()=>setDeleting(item)} aria-label={`מחיקת ${item.title}`}><Trash2 size={15}/></button></div></div>;

  return <>
    <style>{`
      .calendar-day{position:relative}.event-black-dot{position:absolute;width:7px;height:7px;border-radius:50%;background:#171717;left:7px;top:7px;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
      .family-events-day-host{margin-top:12px;padding-top:12px;border-top:1px solid #eadfd6}.family-events-day-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.family-events-day-title strong{display:flex;align-items:center;gap:6px}.family-events-day-title button{border:0;background:transparent;color:#7d4e2d;font:inherit;font-weight:700;cursor:pointer}
      .family-event-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:9px;align-items:start;padding:11px 0;border-bottom:1px solid #eee7e1}.family-event-row:last-child{border-bottom:0}.family-event-owner{width:8px;height:8px;border-radius:50%;margin-top:6px}.family-event-owner.sagi{background:#55ad73}.family-event-owner.maya{background:#dc7da1}.family-event-main{min-width:0}.family-event-main strong{display:block;color:#33261f;font-size:14px}.family-event-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;color:#7d8498;font-size:12px}.family-event-meta span{display:flex;align-items:center;gap:3px}.family-event-actions{display:flex;gap:2px}.family-event-actions button{width:30px;height:30px;border:0;background:transparent;border-radius:8px;display:grid;place-items:center;color:#75665b;cursor:pointer}.family-event-actions button.danger{color:#b54e46}.family-event-actions button:hover{background:#f5eadf}.family-events-empty{font-size:13px;color:#8a8f9d;padding:18px 0;text-align:center}
      .board-tabs>.family-events-board-host{grid-column:1/-1;min-width:0;width:100%}.family-events-board-card{width:100%;border:1px solid #ead8c8;border-radius:24px;background:#fffdf9;overflow:hidden;box-shadow:0 12px 35px rgba(84,55,35,.05)}.family-events-board-head{padding:20px 20px 15px;border-bottom:1px solid #eee3da;display:flex;align-items:center;justify-content:space-between;gap:10px}.family-events-board-head h2{margin:0;font-size:22px;color:#33261f;display:flex;align-items:center;gap:8px}.family-events-board-head span{font-size:13px;color:#7d8498}.family-events-board-list{padding:0 14px 10px}.family-events-board-legend{display:flex;align-items:center;gap:12px;padding:9px 18px;border-bottom:1px solid #eee7e1;color:#7d8498;font-size:12px}.family-events-board-legend span{display:flex;align-items:center;gap:5px}.family-events-board-legend i{width:8px;height:8px;border-radius:50%;display:inline-block}.family-events-board-legend .sagi{background:#55ad73}.family-events-board-legend .maya{background:#dc7da1}
      @media(max-width:760px){
        .event-black-dot{width:6px;height:6px;left:5px;top:5px}.family-event-row{grid-template-columns:7px minmax(0,1fr) auto;gap:7px}.family-event-meta{gap:5px;font-size:11px}
        .board-tabs>.family-events-board-host{grid-column:1!important;grid-row:auto!important;width:100%!important;max-width:100%!important}.family-events-board-card{border-radius:18px}.family-events-board-head{padding:16px 14px 12px}.family-events-board-head h2{font-size:20px}.family-events-board-head>span{font-size:12px}.family-events-board-list{padding:0 10px 8px}
        .task-panel{min-height:0!important;height:auto!important}.task-panel .empty-state{padding:28px 16px 32px!important;gap:14px!important}.task-panel .empty-icon{width:58px!important;height:58px!important;border-radius:18px!important;box-shadow:0 0 0 7px #f8f7ff!important}.task-panel [data-slot=empty-title]{font-size:18px!important}.task-panel [data-slot=empty-description]{font-size:14px!important;line-height:1.5!important}.task-panel .loading{padding:42px 18px!important}
      }
      @media(max-width:420px){.family-events-board-head>span{display:none}.family-events-board-legend{padding:8px 12px}.family-event-meta{line-height:1.35}}
    `}</style>
    {buttonHost&&createPortal(<button className="secondary" type="button" onClick={openNew}><Plus size={20}/> הוספת אירוע</button>,buttonHost)}

    {boardHost&&createPortal(<div className="family-events-board-card" dir="rtl"><div className="family-events-board-head"><h2><CalendarDays size={21}/> אירועים</h2><span>{listedEvents.length} אירועים בלוח</span></div><div className="family-events-board-legend"><span><i className="sagi"/> שגיא</span><span><i className="maya"/> מאיה</span></div>{error&&<div className="shopping-error">{error}</div>}{listedEvents.length===0?<div className="family-events-empty">אין אירועים שמורים כרגע.</div>:<div className="family-events-board-list">{listedEvents.map(item=>eventRow(item))}</div>}</div>,boardHost)}

    {dayHost&&selectedDate&&createPortal(<div dir="rtl"><div className="family-events-day-title"><strong><CalendarPlus size={16}/> אירועים</strong><button type="button" onClick={openNew}>+ הוספת אירוע</button></div>{selectedEvents.length===0?<div className="family-events-empty">אין אירועים בתאריך הזה.</div>:selectedEvents.map(item=>eventRow(item,true))}</div>,dayHost)}

    <Dialog open={editor} onOpenChange={open=>{if(!saving)setEditor(open)}}><DialogContent className="task-dialog" showCloseButton={false} dir="rtl"><div className="modal-heading"><div><DialogTitle>{editing?'עריכת אירוע':'אירוע חדש'}</DialogTitle><DialogDescription>{editing?'עדכון פרטי האירוע בלוח השנה.':'מוסיפים אירוע, פגישה, בדיקה או תור ללוח המשפחתי.'}</DialogDescription></div><button className="icon-button" type="button" onClick={()=>setEditor(false)} disabled={saving} aria-label="סגירה"><X size={20}/></button></div><form onSubmit={save}><label htmlFor="event-title">שם האירוע *</label><input id="event-title" autoFocus required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="למשל, בדיקת רופא"/><div className="form-grid"><div><label htmlFor="event-topic">נושא / תיאור</label><input id="event-topic" maxLength={80} value={draft.topic} onChange={e=>setDraft({...draft,topic:e.target.value})} placeholder="למשל, בדיקה שנתית"/></div><div><label htmlFor="event-person">עבור מי?</label><select id="event-person" className="form-select" value={draft.person} onChange={e=>setDraft({...draft,person:e.target.value as Person})}>{Object.entries(people).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div></div><label htmlFor="event-location">מיקום</label><input id="event-location" maxLength={160} value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})} placeholder="למשל, מרפאת מכבי"/><div className="form-grid"><div><label htmlFor="event-date">תאריך *</label><input id="event-date" type="date" required value={draft.event_date} onChange={e=>setDraft({...draft,event_date:e.target.value})}/></div><div><label htmlFor="event-time">שעה</label><input id="event-time" type="time" value={draft.event_time} onChange={e=>setDraft({...draft,event_time:e.target.value})}/></div></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button className="primary" type="submit" disabled={saving||!draft.title.trim()}>{saving?<LoaderCircle className="spin" size={18}/>:<Check size={18}/>} {saving?'שומרים…':editing?'שמירת שינויים':'הוספת האירוע'}</button><button className="text-button" type="button" onClick={()=>setEditor(false)} disabled={saving}>ביטול</button></div></form></DialogContent></Dialog>

    <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!saving)setDeleting(null)}}><AlertDialogContent dir="rtl"><AlertDialogTitle>למחוק את האירוע?</AlertDialogTitle><AlertDialogDescription>האירוע „{deleting?.title}” יוסר מלוח השנה.</AlertDialogDescription><div className="confirm-actions"><AlertDialogAction className="delete-button" onClick={remove} disabled={saving}>{saving?'מוחקים…':'מחיקת אירוע'}</AlertDialogAction><AlertDialogCancel disabled={saving}>ביטול</AlertDialogCancel></div></AlertDialogContent></AlertDialog>
  </>;
}
