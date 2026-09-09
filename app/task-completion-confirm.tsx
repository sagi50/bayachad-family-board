'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Task } from '@/lib/task-types';

type TasksPayload = {tasks:Task[]; error?:string};

export default function TaskCompletionConfirm(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [staged,setStaged]=useState<Set<string>>(()=>new Set());
  const [busy,setBusy]=useState<string|null>(null);

  const load=useCallback(async()=>{
    try{
      const response=await apiFetch('/api/tasks',{cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json() as TasksPayload;
      setTasks(data.tasks);
      setStaged(current=>{
        const valid=new Set(data.tasks.filter(task=>task.status!=='done').map(task=>task.id));
        return new Set([...current].filter(id=>valid.has(id)));
      });
    }catch{}
  },[]);

  useEffect(()=>{
    load();
    const timer=setInterval(load,15000);
    const focus=()=>load();
    window.addEventListener('focus',focus);
    return()=>{clearInterval(timer);window.removeEventListener('focus',focus)};
  },[load]);

  useEffect(()=>{
    const wire=()=>{
      const used=new Set<string>();
      document.querySelectorAll<HTMLElement>('.task-card:not(.completed)').forEach(card=>{
        const title=card.querySelector<HTMLElement>('.task-main h3')?.textContent?.trim();
        if(!title)return;
        const task=tasks.find(item=>item.status!=='done'&&item.title===title&&!used.has(item.id));
        if(!task)return;
        used.add(task.id);
        card.dataset.completionTaskId=task.id;
        card.classList.toggle('completion-staged',staged.has(task.id));
        let button=card.querySelector<HTMLButtonElement>('.completion-confirm-button');
        if(!button){
          button=document.createElement('button');
          button.type='button';
          button.className='completion-confirm-button';
          button.textContent='טופל';
          const actions=card.querySelector<HTMLElement>('.task-actions');
          actions?.prepend(button);
        }
        button.dataset.taskId=task.id;
        button.disabled=busy===task.id;
      });
    };
    wire();
    const observer=new MutationObserver(wire);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[tasks,staged,busy]);

  useEffect(()=>{
    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement;
      const checkbox=target.closest<HTMLElement>('.task-check');
      if(checkbox){
        const card=checkbox.closest<HTMLElement>('.task-card');
        const id=card?.dataset.completionTaskId;
        if(card&&!card.classList.contains('completed')&&id){
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          setStaged(current=>{
            const next=new Set(current);
            if(next.has(id))next.delete(id);else next.add(id);
            return next;
          });
          return;
        }
      }
      const confirm=target.closest<HTMLButtonElement>('.completion-confirm-button');
      if(confirm){
        event.preventDefault();
        event.stopPropagation();
        const id=confirm.dataset.taskId;
        if(!id||!staged.has(id)||busy)return;
        const task=tasks.find(item=>item.id===id);
        if(!task)return;
        setBusy(id);
        apiFetch('/api/tasks',{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...task,status:'done'}),
        }).then(async response=>{
          if(response.ok){
            setStaged(current=>{const next=new Set(current);next.delete(id);return next});
            await load();
            window.dispatchEvent(new Event('focus'));
          }
        }).finally(()=>setBusy(null));
      }
    };
    document.addEventListener('click',onClick,true);
    return()=>document.removeEventListener('click',onClick,true);
  },[tasks,staged,busy,load]);

  return <style>{`
    .task-card:not(.completed) .completion-confirm-button{display:none;border:0;border-radius:9px;padding:7px 11px;background:#2f9b68;color:#fff;font:inherit;font-size:13px;font-weight:800;white-space:nowrap;align-items:center;justify-content:center;min-height:30px}
    .task-card.completion-staged .completion-confirm-button{display:inline-flex}
    .task-card.completion-staged .task-check{background:#2f9b68!important;border-color:#2f9b68!important;color:white!important;position:relative}
    .task-card.completion-staged .task-check::after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;color:white;font-size:16px;font-weight:900;line-height:1}
    @media(max-width:760px){.task-card.completion-staged .task-actions{gap:4px}.task-card:not(.completed) .completion-confirm-button{width:auto;min-width:52px;height:31px;padding:5px 8px;font-size:12px}}
  `}</style>;
}
