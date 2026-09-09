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

      const tabs=document.querySelector<HTMLElement>('.board-tabs');
      const inboxes=tabs?.querySelector<HTMLElement>(':scope > .inboxes');
      const summary=document.querySelector<HTMLElement>('.summary-strip');
      if(tabs&&inboxes&&summary&&summary.parentElement!==tabs){
        tabs.insertBefore(summary,inboxes.nextSibling);
      }else if(tabs&&inboxes&&summary&&summary.previousElementSibling!==inboxes){
        tabs.insertBefore(summary,inboxes.nextSibling);
      }

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
          }else if(!isPast&&badge){
            badge.remove();
          }
          (isPast?past:current).push(row);
        });

        const desired=[...current,...past];
        const actual=Array.from(list.children);
        const different=desired.some((row,index)=>actual[index]!==row);
        if(different){
          const fragment=document.createDocumentFragment();
          desired.forEach(row=>fragment.appendChild(row));
          list.appendChild(fragment);
        }

        const count=document.querySelector<HTMLElement>('.family-events-board-head > span');
        const nextText=`${current.length} אירועים קרובים`;
        if(count&&count.textContent!==nextText)count.textContent=nextText;
      }
    };

    apply();
    const timer=window.setInterval(apply,2000);
    const onFocus=()=>apply();
    window.addEventListener('focus',onFocus);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus)};
  },[]);

  return <style>{`
    .completed .task-main h3{color:#33261f!important;text-decoration:none!important;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .completed-badge{display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;border-radius:999px;background:#e1f6ec;color:#208266;font-size:12px;font-weight:800;line-height:1.2;text-decoration:none!important;white-space:nowrap}
    .past-event-row{opacity:.68}
    .past-event-badge{display:inline-flex;align-items:center;justify-content:center;margin-inline-start:7px;padding:2px 7px;border-radius:999px;background:#ece8e4;color:#75665b;font-size:11px;font-weight:800;line-height:1.2;vertical-align:middle}
    .board-tabs>.summary-strip{grid-column:1/-1!important;width:100%!important;margin:0!important;order:0!important}

    @media(max-width:760px){
      .workspace{padding-left:16px!important;padding-right:16px!important}
      .intro{display:block!important;margin-bottom:22px!important}
      .intro>div:first-child{margin-bottom:16px!important}
      .intro>div:last-child{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;width:100%!important;align-items:stretch!important}
      .intro>div:last-child>.primary,.intro>div:last-child>.secondary{width:100%!important;min-width:0!important;max-width:none!important;min-height:46px!important;height:46px!important;padding:7px 6px!important;border-radius:11px!important;font-size:12px!important;line-height:1!important;gap:5px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;box-shadow:none!important}
      .intro>div:last-child>.primary svg,.intro>div:last-child>.secondary svg{width:15px!important;height:15px!important;flex:0 0 15px!important}
      .intro>div:last-child>.secondary{background:#fffaf5!important;border-color:#e4d4c5!important;color:#795033!important}
      .intro>div:last-child>.primary{background:#8a5a38!important;border-color:#8a5a38!important;color:#fff!important}
      .intro>div:last-child>a[href="/shopping"]{display:none!important}
      .calendar-card,.family-events-board-card,.task-panel,.shopping-board-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important}
      .board-tabs{width:100%!important;min-width:0!important;overflow:visible!important}
      .board-tabs>.summary-strip{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin:0 0 2px!important}
      .board-tabs>.summary-strip .summary-card{min-height:74px!important;padding:10px 9px!important;border-radius:15px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important}
      .board-tabs>.summary-strip .summary-card strong{font-size:24px!important;line-height:1!important}
      .board-tabs>.summary-strip .summary-card span{font-size:11.5px!important;line-height:1.25!important}
      .task-card{min-width:0!important}
      .task-main{min-width:0!important}
      .task-actions{flex:0 0 auto!important}
      .completed-badge{font-size:11px;padding:3px 7px}
      .past-event-badge{font-size:10px;padding:2px 6px}
    }

    @media(max-width:430px){
      .intro>div:last-child{gap:6px!important}
      .intro>div:last-child>.primary,.intro>div:last-child>.secondary{font-size:11.5px!important;padding:7px 4px!important;gap:4px!important}
      .intro>div:last-child>.primary svg,.intro>div:last-child>.secondary svg{display:none!important}
      .board-tabs>.summary-strip .summary-card{min-height:68px!important;padding:8px 7px!important;border-radius:14px!important}
      .board-tabs>.summary-strip .summary-card strong{font-size:22px!important}
      .board-tabs>.summary-strip .summary-card span{font-size:11px!important}
    }

    @media(max-width:350px){
      .intro>div:last-child{grid-template-columns:1fr!important}
      .intro>div:last-child>.primary,.intro>div:last-child>.secondary{font-size:13px!important;height:44px!important}
    }
  `}</style>;
}
