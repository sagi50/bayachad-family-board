'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Clock3, LoaderCircle, PackageCheck, Pencil, Trash2, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { apiFetch } from '@/lib/api';

type ShoppingStatus = 'now' | 'future';
type ShoppingItem = { id:string; name:string; quantity:string; notes:string; status:'now'|'future'|'done'; updated_at:string; updated_by:string; version:number };
type ShoppingPayload = { items:ShoppingItem[]; error?:string };
const blank = {name:'',quantity:'1',notes:'',status:'now' as ShoppingStatus};

export default function ShoppingBoardPanel(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [items,setItems]=useState<ShoppingItem[]>([]);
  const [tab,setTab]=useState<ShoppingStatus>('now');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [editing,setEditing]=useState<ShoppingItem|null>(null);
  const [draft,setDraft]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState<ShoppingItem|null>(null);

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
    const refresh=()=>load();
    window.addEventListener('shopping-item-added',refresh);
    window.addEventListener('focus',refresh);
    const timer=setInterval(load,15000);
    return()=>{window.removeEventListener('shopping-item-added',refresh);window.removeEventListener('focus',refresh);clearInterval(timer);};
  },[load]);

  const visible=useMemo(()=>items.filter(item=>item.status===tab),[items,tab]);
  const nowCount=items.filter(item=>item.status==='now').length;
  const futureCount=items.filter(item=>item.status==='future').length;

  function openEdit(item:ShoppingItem){
    setEditing(item);
    setDraft({name:item.name,quantity:item.quantity||'1',notes:item.notes||'',status:item.status==='future'?'future':'now'});
    setError('');
  }

  async function saveEdit(e:React.FormEvent){
    e.preventDefault();
    if(!editing||saving||!draft.name.trim()) return;
    setSaving(true);setError('');
    try{
      const response=await apiFetch('/api/shopping',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,id:editing.id,version:editing.version})});
      const data=await response.json() as {error?:string};
      if(!response.ok){if(response.status===409)await load();throw new Error(data.error||'לא הצלחנו לעדכן את המוצר.');}
      setEditing(null);
      setTab(draft.status);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'לא הצלחנו לעדכן את המוצר.');}
    finally{setSaving(false);}
  }

  async function removeItem(){
    if(!deleting||saving) return;
    setSaving(true);setError('');
    try{
      const response=await apiFetch('/api/shopping',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deleting.id,version:deleting.version})});
      const data=await response.json() as {error?:string};
      if(!response.ok){if(response.status===409)await load();throw new Error(data.error||'לא הצלחנו למחוק את המוצר.');}
      setDeleting(null);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'לא הצלחנו למחוק את המוצר.');setDeleting(null);}
    finally{setSaving(false);}
  }

  if(!host) return null;
  return createPortal(<>
    <style>{`
      .board-tabs{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
      .board-tabs>.inboxes,.board-tabs>.error-banner{grid-column:1/-1}
      .board-tabs>.task-panel{grid-column:1;min-width:0}
      .board-tabs>.shopping-board-host{grid-column:2;grid-row:2 / span 20;min-width:0;align-self:stretch}
      .shopping-board-card{height:100%;min-height:430px;border:1px solid #ead8c8;border-radius:24px;background:#fffdf9;overflow:hidden;box-shadow:0 12px 35px rgba(84,55,35,.05)}
      .shopping-board-head{padding:22px 20px 16px;border-bottom:1px solid #eee3da;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .shopping-board-head h2{margin:0;font-size:24px;color:#33261f;display:flex;align-items:center;gap:8px}.shopping-board-head span{font-size:13px;color:#7d8498}
      .shopping-mini-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 14px 6px}.shopping-mini-tab{border:1px solid #e7d7c8;background:#fffaf5;border-radius:14px;padding:10px 8px;font:inherit;color:#687086;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}.shopping-mini-tab.active{background:#f3e3d2;color:#7d4e2d;border-color:#c49a75;font-weight:700}.shopping-mini-count{min-width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.72);display:inline-grid;place-items:center;font-size:12px}
      .shopping-products{padding:10px 14px 16px;display:flex;flex-direction:column;gap:9px}.shopping-product{display:flex;align-items:center;gap:8px;padding:12px;border:1px solid #eee2d8;border-radius:14px;background:#fff}.shopping-product-main{min-width:0;flex:1}.shopping-product-name{font-weight:750;color:#34271f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shopping-product-note{font-size:12px;color:#8a8f9d;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shopping-qty{flex:0 0 auto;background:#f5eadf;color:#795033;border-radius:999px;padding:6px 9px;font-size:13px;font-weight:700}.shopping-actions{display:flex;gap:4px}.shopping-action{width:32px;height:32px;border:1px solid #eadfd6;background:#fffaf6;border-radius:9px;display:grid;place-items:center;color:#7b6556;cursor:pointer}.shopping-action.danger{color:#b54e46}.shopping-action:hover{background:#f5eadf}
      .shopping-empty{padding:48px 14px;text-align:center;color:#7d8498}.shopping-empty strong{display:block;color:#3c2c23;margin:8px 0 4px}.shopping-error{margin:10px 14px;padding:10px;border-radius:12px;background:#fff1ef;color:#a3463d;font-size:13px}
      @media(max-width:560px){.board-tabs{gap:8px}.shopping-board-card{border-radius:18px;min-height:390px}.shopping-board-head{padding:16px 10px 12px}.shopping-board-head h2{font-size:19px}.shopping-board-head>span{display:none}.shopping-mini-tabs{padding:10px 8px 4px;gap:5px}.shopping-mini-tab{font-size:12px;padding:9px 5px}.shopping-products{padding:8px;gap:7px}.shopping-product{padding:9px 7px;gap:5px}.shopping-product-name{font-size:14px}.shopping-qty{font-size:11px;padding:5px 7px}.shopping-action{width:28px;height:28px}.task-panel{border-radius:18px!important}.list-heading{padding-left:10px!important;padding-right:10px!important}}
    `}</style>
    <div className="shopping-board-card" dir="rtl">
      <div className="shopping-board-head"><h2><ShoppingCart size={21}/> קניות</h2><span>{nowCount+futureCount} מוצרים ברשימות</span></div>
      <div className="shopping-mini-tabs">
        <button className={'shopping-mini-tab '+(tab==='now'?'active':'')} onClick={()=>setTab('now')}><ShoppingCart size={15}/> עכשווית <span className="shopping-mini-count">{nowCount}</span></button>
        <button className={'shopping-mini-tab '+(tab==='future'?'active':'')} onClick={()=>setTab('future')}><Clock3 size={15}/> עתידית <span className="shopping-mini-count">{futureCount}</span></button>
      </div>
      {error&&<div className="shopping-error">{error}</div>}
      {loading?<div className="shopping-empty"><LoaderCircle className="spin"/> טוענים קניות…</div>:visible.length===0?<div className="shopping-empty"><PackageCheck size={34}/><strong>{tab==='now'?'אין כרגע מוצרים לקנייה':'אין מוצרים לרשימה עתידית'}</strong><span>מוצרים שתוסיפו דרך „הוספת מוצר” יופיעו כאן.</span></div>:<div className="shopping-products">{visible.map(item=><div className="shopping-product" key={item.id}><div className="shopping-product-main"><div className="shopping-product-name">{item.name}</div>{item.notes&&<div className="shopping-product-note">{item.notes}</div>}</div><span className="shopping-qty">{item.quantity||'1'}</span><div className="shopping-actions"><button className="shopping-action" onClick={()=>openEdit(item)} aria-label={`עריכת ${item.name}`}><Pencil size={15}/></button><button className="shopping-action danger" onClick={()=>setDeleting(item)} aria-label={`מחיקת ${item.name}`}><Trash2 size={15}/></button></div></div>)}</div>}
    </div>

    <Dialog open={!!editing} onOpenChange={open=>{if(!open&&!saving)setEditing(null)}}><DialogContent className="task-dialog" showCloseButton={false} dir="rtl"><div className="modal-heading"><div><DialogTitle>עריכת מוצר</DialogTitle><DialogDescription>אפשר לעדכן את הפרטים או להעביר בין הרשימה העכשווית לעתידית.</DialogDescription></div><button className="icon-button" onClick={()=>setEditing(null)} disabled={saving}><X size={20}/></button></div><form onSubmit={saveEdit}><label htmlFor="shopping-edit-name">שם המוצר *</label><input id="shopping-edit-name" autoFocus required maxLength={160} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><div className="form-grid"><div><label htmlFor="shopping-edit-quantity">כמות</label><input id="shopping-edit-quantity" maxLength={80} value={draft.quantity} onChange={e=>setDraft({...draft,quantity:e.target.value})}/></div><div><label htmlFor="shopping-edit-status">רשימה</label><select id="shopping-edit-status" className="form-select" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as ShoppingStatus})}><option value="now">רשימה עכשווית</option><option value="future">רשימה עתידית</option></select></div></div><label htmlFor="shopping-edit-notes">הערה</label><input id="shopping-edit-notes" maxLength={500} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/><div className="form-actions"><button className="primary" type="submit" disabled={saving||!draft.name.trim()}>{saving?<LoaderCircle className="spin" size={18}/>:<Check size={18}/>} {saving?'שומרים…':'שמירת שינויים'}</button><button className="text-button" type="button" onClick={()=>setEditing(null)} disabled={saving}>ביטול</button></div></form></DialogContent></Dialog>

    <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!saving)setDeleting(null)}}><AlertDialogContent dir="rtl"><AlertDialogTitle>למחוק את המוצר?</AlertDialogTitle><AlertDialogDescription>המוצר „{deleting?.name}” יימחק מרשימת הקניות.</AlertDialogDescription><div className="confirm-actions"><AlertDialogAction className="delete-button" onClick={removeItem} disabled={saving}>{saving?'מוחקים…':'מחיקת מוצר'}</AlertDialogAction><AlertDialogCancel disabled={saving}>ביטול</AlertDialogCancel></div></AlertDialogContent></AlertDialog>
  </>,host);
}
