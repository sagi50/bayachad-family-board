'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, LoaderCircle, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';

type ShoppingStatus = 'now' | 'future';
const blank = { name:'', quantity:'1', notes:'', status:'now' as ShoppingStatus };

export default function QuickShopping(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    const findHost=()=>{
      const addTask=document.querySelector<HTMLButtonElement>('.intro button.primary');
      const parent=addTask?.parentElement;
      const oldShoppingLink=parent?.querySelector<HTMLAnchorElement>('a[href="/shopping"]');
      if(oldShoppingLink) oldShoppingLink.style.display='none';
      if(parent) setHost(parent);
    };
    findHost();
    const observer=new MutationObserver(findHost);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  function openEditor(){
    setDraft(blank);
    setError('');
    setOpen(true);
  }

  async function save(event:React.FormEvent){
    event.preventDefault();
    if(saving||!draft.name.trim()) return;
    setSaving(true);
    setError('');
    try{
      const response=await apiFetch('/api/shopping',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(draft),
      });
      const data=await response.json() as {error?:string};
      if(!response.ok) throw new Error(data.error||'לא הצלחנו לשמור את המוצר.');
      setOpen(false);
      window.dispatchEvent(new CustomEvent('shopping-item-added',{detail:{name:draft.name}}));
    }catch(e){
      setError(e instanceof Error?e.message:'לא הצלחנו לשמור את המוצר.');
    }finally{
      setSaving(false);
    }
  }

  return <>
    {host&&createPortal(<button className="secondary" type="button" onClick={openEditor}><Plus size={20}/> הוספת מוצר</button>,host)}
    <Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value)}}>
      <DialogContent className="task-dialog" showCloseButton={false} dir="rtl">
        <div className="modal-heading"><div><DialogTitle>מוצר חדש</DialogTitle><DialogDescription>מוסיפים מוצר לרשימת הקניות המשותפת.</DialogDescription></div><button className="icon-button" type="button" onClick={()=>setOpen(false)} disabled={saving} aria-label="סגירה"><X size={20}/></button></div>
        <form onSubmit={save}>
          <label htmlFor="quick-shopping-name">שם המוצר <span className="required">*</span></label>
          <input id="quick-shopping-name" autoFocus required maxLength={160} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="למשל, חלב"/>
          <div className="form-grid">
            <div><label htmlFor="quick-shopping-quantity">כמות</label><input id="quick-shopping-quantity" maxLength={80} value={draft.quantity} onChange={e=>setDraft({...draft,quantity:e.target.value})} placeholder="למשל, 2 יחידות"/></div>
            <div><label id="quick-shopping-status-label">מתי לקנות?</label><Select value={draft.status} onValueChange={value=>value&&setDraft({...draft,status:value as ShoppingStatus})}><SelectTrigger aria-labelledby="quick-shopping-status-label" className="form-select"><SelectValue>{draft.status==='now'?'לקנייה עכשיו':'לזכור להמשך'}</SelectValue></SelectTrigger><SelectContent dir="rtl"><SelectItem value="now">לקנייה עכשיו</SelectItem><SelectItem value="future">לזכור להמשך</SelectItem></SelectContent></Select></div>
          </div>
          <label htmlFor="quick-shopping-notes">הערה</label>
          <input id="quick-shopping-notes" maxLength={500} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="למשל, 3% או מותג מסוים"/>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><button className="primary" type="submit" disabled={saving||!draft.name.trim()}>{saving?<LoaderCircle className="spin" size={18}/>:<Check size={18}/>} {saving?'שומרים…':'הוספת המוצר'}</button><button className="text-button" type="button" onClick={()=>setOpen(false)} disabled={saving}>ביטול</button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
