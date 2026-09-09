'use client';
import { useEffect } from 'react';

function todayKey(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
}

function dateKeyFromText(text:string){
  const match=text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if(!match)return null;
  return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
}

export default function StatusEnhancements(){
  useEffect(()=>{
    const apply=()=>{
      document.querySelectorAll<HTMLElement>('.task-card.completed .task-main h3').forEach(title=>{
        if(!title.querySelector('.completed-badge')){
          const badge=document.createElement('span');
          badge.className='completed-badge';
          badge.textContent='בוצע';
          title.appendChild(badge);
        }
      });

      const list=document.querySelector<HTMLElement>('.family-events-board-list');
      if(list){
        const today=todayKey();
        const rows=Array.from(list.querySelectorAll<HTMLElement>(':scope > .family-event-row'));
        const current:HTMLElement[]=[];
        const past:HTMLElement[]=[];

        rows.forEach(row=>{
          const dateText=Array.from(row.querySelectorAll<HTMLElement>('.family-event-meta span')).map(node=>node.textContent||'').find(text=>dateKeyFromText(text));
          const key=dateText?dateKeyFromText(dateText):null;
          const isPast=!!key&&key<today;
          row.classList.toggle('past-event-row',isPast);
          let badge=row.querySelector<HTMLElement>('.past-event-badge');
          if(isPast&&!badge){
            badge=document.createElement('span');
            badge.className='past-event-badge';
            badge.textContent='עבר';
            row.querySelector('.family-event-main strong')?.appendChild(badge);
          }else if(!isPast&&badge){badge.remove();}
          (isPast?past:current).push(row);
        });

        [...current,...past].forEach(row=>list.appendChild(row));
        const count=document.querySelector<HTMLElement>('.family-events-board-head > span');
        if(count)count.textContent=`${current.length} אירועים קרובים`;
      }
    };

    apply();
    const observer=new MutationObserver(apply);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  return <style>{`
    .completed .task-main h3{color:#33261f!important;text-decoration:none!important;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .completed-badge{display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;border-radius:999px;background:#e1f6ec;color:#208266;font-size:12px;font-weight:800;line-height:1.2;text-decoration:none!important;white-space:nowrap}
    .past-event-row{opacity:.7}
    .past-event-badge{display:inline-flex;align-items:center;justify-content:center;margin-inline-start:7px;padding:2px 7px;border-radius:999px;background:#ece8e4;color:#75665b;font-size:11px;font-weight:800;line-height:1.2;vertical-align:middle}
    @media(max-width:560px){
      .completed-badge{font-size:11px;padding:3px 7px}.past-event-badge{font-size:10px;padding:2px 6px}
      .intro>div:last-child{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;width:100%!important;align-items:stretch!important}
      .intro>div:last-child>.primary,.intro>div:last-child>.secondary{width:100%!important;min-width:0!important;min-height:48px!important;height:48px!important;padding:8px 5px!important;border-radius:12px!important;font-size:12px!important;line-height:1.15!important;gap:5px!important;white-space:nowrap!important;box-shadow:none!important}
      .intro>div:last-child>.primary svg,.intro>div:last-child>.secondary svg{width:16px!important;height:16px!important;flex:0 0 16px!important}
      .intro>div:last-child>.secondary{background:#fffaf5!important;border-color:#e4d4c5!important;color:#795033!important}
      .intro>div:last-child>.primary{background:#8a5a38!important;border-color:#8a5a38!important;color:#fff!important}
      .intro>div:last-child>a[href="/shopping"]{display:none!important}
    }
    @media(max-width:380px){
      .intro>div:last-child{gap:5px!important}
      .intro>div:last-child>.primary,.intro>div:last-child>.secondary{font-size:11px!important;padding:7px 3px!important;gap:3px!important}
      .intro>div:last-child>.primary svg,.intro>div:last-child>.secondary svg{width:15px!important;height:15px!important;flex-basis:15px!important}
    }
  `}</style>;
}
