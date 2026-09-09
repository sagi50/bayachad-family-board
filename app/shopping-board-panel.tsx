'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Clock3, LoaderCircle, PackageCheck } from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

type ShoppingStatus = 'now' | 'future';
type ShoppingItem = { id:string; name:string; quantity:string; notes:string; status:'now'|'future'|'done'; updated_at:string; updated_by:string; version:number };
type ShoppingPayload = { items:ShoppingItem[]; error?:string };

export default function ShoppingBoardPanel(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [items,setItems]=useState<ShoppingItem[]>([]);
  const [tab,setTab]=useState<ShoppingStatus>('now');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    try{
      const response=await apiFetch('/api/shopping',{cache:'no-store'});
      const data=await response.json() as ShoppingPayload;
      if(!response.ok) throw new Error(data.error||'לא הצלחנו לטעון את הקניות.');
      setItems(data.items);
      setError('');
    }catch(e){
      setError(e instanceof Error?e.message:'לא הצלחנו לטעון את הקניות.');
    }finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    const attach=()=>{
      const tabs=document.querySelector<HTMLElement>('.board-tabs');
      if(!tabs) return;
      let panel=tabs.querySelector<HTMLElement>(':scope > .shopping-board-host');
      if(!panel){
        panel=document.createElement('section');
        panel.className='shopping-board-host';
        tabs.appendChild(panel);
      }
      setHost(panel);
    };
    attach();
    const observer=new MutationObserver(attach);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    load();
    const added=()=>load();
    const focus=()=>load();
    window.addEventListener('shopping-item-added',added);
    window.addEventListener('focus',focus);
    const timer=setInterval(load,15000);
    return()=>{window.removeEventListener('shopping-item-added',added);window.removeEventListener('focus',focus);clearInterval(timer);};
  },[load]);

  const visible=useMemo(()=>items.filter(item=>item.status===tab),[items,tab]);
  const nowCount=items.filter(item=>item.status==='now').length;
  const futureCount=items.filter(item=>item.status==='future').length;

  if(!host) return null;
  return createPortal(<>
    <style>{`
      .board-tabs{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
      .board-tabs>.inboxes,.board-tabs>.error-banner{grid-column:1/-1}
      .board-tabs>.task-panel{grid-column:1;min-width:0}
      .board-tabs>.shopping-board-host{grid-column:2;grid-row:2 / span 20;min-width:0;align-self:stretch}
      .shopping-board-card{height:100%;min-height:430px;border:1px solid #ead8c8;border-radius:24px;background:#fffdf9;overflow:hidden;box-shadow:0 12px 35px rgba(84,55,35,.05)}
      .shopping-board-head{padding:22px 20px 16px;border-bottom:1px solid #eee3da;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .shopping-board-head h2{margin:0;font-size:24px;color:#33261f;display:flex;align-items:center;gap:8px}
      .shopping-board-head span{font-size:13px;color:#7d8498}
      .shopping-mini-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 14px 6px}
      .shopping-mini-tab{border:1px solid #e7d7c8;background:#fffaf5;border-radius:14px;padding:10px 8px;font:inherit;color:#687086;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}
      .shopping-mini-tab.active{background:#f3e3d2;color:#7d4e2d;border-color:#c49a75;font-weight:700}
      .shopping-mini-count{min-width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.72);display:inline-grid;place-items:center;font-size:12px}
      .shopping-products{padding:10px 14px 16px;display:flex;flex-direction:column;gap:9px}
      .shopping-product{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 12px;border:1px solid #eee2d8;border-radius:14px;background:#fff}
      .shopping-product-main{min-width:0}
      .shopping-product-name{font-weight:750;color:#34271f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .shopping-product-note{font-size:12px;color:#8a8f9d;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .shopping-qty{flex:0 0 auto;background:#f5eadf;color:#795033;border-radius:999px;padding:6px 9px;font-size:13px;font-weight:700}
      .shopping-empty{padding:48px 14px;text-align:center;color:#7d8498}.shopping-empty strong{display:block;color:#3c2c23;margin:8px 0 4px}
      .shopping-error{margin:10px 14px;padding:10px;border-radius:12px;background:#fff1ef;color:#a3463d;font-size:13px}
      @media(max-width:560px){.board-tabs{gap:8px}.shopping-board-card{border-radius:18px;min-height:390px}.shopping-board-head{padding:16px 10px 12px}.shopping-board-head h2{font-size:19px}.shopping-board-head>span{display:none}.shopping-mini-tabs{padding:10px 8px 4px;gap:5px}.shopping-mini-tab{font-size:12px;padding:9px 5px}.shopping-products{padding:8px;gap:7px}.shopping-product{padding:10px 8px}.shopping-product-name{font-size:14px}.shopping-qty{font-size:11px;padding:5px 7px}.task-panel{border-radius:18px!important}.list-heading{padding-left:10px!important;padding-right:10px!important}}
    `}</style>
    <div className="shopping-board-card" dir="rtl">
      <div className="shopping-board-head"><h2><ShoppingCart size={21}/> קניות</h2><span>{nowCount+futureCount} מוצרים ברשימות</span></div>
      <div className="shopping-mini-tabs">
        <button className={'shopping-mini-tab '+(tab==='now'?'active':'')} onClick={()=>setTab('now')}><ShoppingCart size={15}/> עכשווית <span className="shopping-mini-count">{nowCount}</span></button>
        <button className={'shopping-mini-tab '+(tab==='future'?'active':'')} onClick={()=>setTab('future')}><Clock3 size={15}/> עתידית <span className="shopping-mini-count">{futureCount}</span></button>
      </div>
      {error&&<div className="shopping-error">{error}</div>}
      {loading?<div className="shopping-empty"><LoaderCircle className="spin"/> טוענים קניות…</div>:visible.length===0?<div className="shopping-empty"><PackageCheck size={34}/><strong>{tab==='now'?'אין כרגע מוצרים לקנייה':'אין מוצרים לרשימה עתידית'}</strong><span>מוצרים שתוסיפו דרך „הוספת מוצר” יופיעו כאן.</span></div>:<div className="shopping-products">{visible.map(item=><div className="shopping-product" key={item.id}><div className="shopping-product-main"><div className="shopping-product-name">{item.name}</div>{item.notes&&<div className="shopping-product-note">{item.notes}</div>}</div><span className="shopping-qty">{item.quantity||'1'}</span></div>)}</div>}
    </div>
  </>,host);
}
