'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, CheckCheck, Clock3, LoaderCircle, Pencil, Plus, RefreshCw, ShoppingCart, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch as fetch } from '@/lib/api';
import { shoppingStatuses, type ShoppingItem, type ShoppingStatus } from '@/lib/shopping-types';

const blank = { name:'', quantity:'1', notes:'', status:'now' as ShoppingStatus };
type Payload = {items:ShoppingItem[];user:string;error?:string};

export default function ShoppingList(){
  const [items,setItems]=useState<ShoppingItem[]>([]);
  const [tab,setTab]=useState<ShoppingStatus>('now');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [editor,setEditor]=useState(false);
  const [editing,setEditing]=useState<ShoppingItem|null>(null);
  const [draft,setDraft]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState<ShoppingItem|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [user,setUser]=useState('');

  const load=useCallback(async()=>{try{const res=await fetch('/api/shopping',{cache:'no-store'});const data=await res.json() as Payload;if(!res.ok)throw new Error(data.error||'לא הצלחנו לטעון את רשימת הקניות.');setItems(data.items);setUser(data.user);setError('');}catch(e){setError(e instanceof Error?e.message:'החיבור לא הצליח.');}finally{setLoading(false);}},[]);
  useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[load]);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3500);return()=>clearTimeout(timer);},[message]);

  const openNew=()=>{setEditing(null);setDraft({...blank,status:tab==='done'?'now':tab});setEditor(true);};
  const openItem=(item:ShoppingItem)=>{setEditing(item);setDraft({name:item.name,quantity:item.quantity,notes:item.notes,status:item.status});setEditor(true);};
  async function mutate(method:string,body:unknown){const res=await fetch('/api/shopping',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json() as {error?:string};if(!res.ok){if(res.status===409)await load();throw new Error(data.error||'השינוי לא נשמר.');}await load();}
  async function save(e:React.FormEvent){e.preventDefault();if(saving)return;setSaving(true);try{await mutate(editing?'PATCH':'POST',{...draft,...(editing?{id:editing.id,version:editing.version}:{})});setEditor(false);setTab(draft.status);setMessage(editing?'הפריט עודכן':'המוצר נוסף לרשימה');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
  async function toggle(item:ShoppingItem){if(busy)return;setBusy(item.id);try{await mutate('PATCH',{name:item.name,quantity:item.quantity,notes:item.notes,status:item.status==='done'?'now':'done',id:item.id,version:item.version});setMessage(item.status==='done'?'הפריט חזר לרשימה':'סומן כנקנה');}catch(e){setError((e as Error).message);}finally{setBusy(null);}}
  async function remove(){if(!deleting||saving)return;setSaving(true);try{await mutate('DELETE',{id:deleting.id,version:deleting.version});setDeleting(null);setMessage('הפריט נמחק');}catch(e){setError((e as Error).message);setDeleting(null);}finally{setSaving(false);}}

  return <div className="app-shell"><header className="masthead"><a className="brand" href="/"><span className="brand-mark"><ShoppingCart size={24}/></span><strong>רשימת קניות<span>.</span></strong></a><a className="secondary" href="/"><ArrowRight size={17}/> חזרה ללוח</a></header>
  <main className="workspace"><div className="intro"><div><p className="date-line">{user?`מחובר: ${user}`:'הרשימה המשותפת שלנו'}</p><h1>קניות לבית<span>.</span></h1><p>כל מה שצריך לקנות עכשיו, ומה שכדאי לזכור לפעם הבאה.</p></div><button className="primary" onClick={openNew}><Plus size={20}/> הוספת מוצר</button></div>
  <Tabs value={tab} onValueChange={v=>setTab(v as ShoppingStatus)} className="board-tabs"><TabsList className="inboxes">{(['now','future','done'] as ShoppingStatus[]).map(status=>{const Icon=status==='now'?ShoppingCart:status==='future'?Clock3:CheckCheck;return <TabsTrigger key={status} value={status} className={'inbox inbox-'+(status==='now'?'active':status==='future'?'future':'done')}><span className="inbox-symbol"><Icon size={22}/></span><span className="inbox-name">{shoppingStatuses[status]}</span><span className="inbox-count">{items.filter(i=>i.status===status).length}</span></TabsTrigger>})}</TabsList>
  {error&&<div className="error-banner"><span>{error}</span><button onClick={load}><RefreshCw size={16}/> ניסיון נוסף</button></div>}
  {(['now','future','done'] as ShoppingStatus[]).map(status=><TabsContent key={status} value={status} className="task-panel"><div className="list-heading"><h2>{shoppingStatuses[status]}</h2><span>{status==='now'?'הדברים שצריך לקנות בעדיפות גבוהה':status==='future'?'דברים שכדאי לזכור לקנייה עתידית':'מה שכבר נקנה'}</span></div>{loading?<div className="loading"><LoaderCircle className="spin"/> טוענים…</div>:!items.some(i=>i.status===status)?<div className="empty-state"><h3>{status==='now'?'אין כרגע מוצרים דחופים':status==='future'?'אין פריטים שמחכים להמשך':'עדיין לא סומנו מוצרים כנקנו'}</h3>{status!=='done'&&<button className="secondary" onClick={openNew}><Plus size={18}/> הוספת מוצר</button>}</div>:<div className="task-list">{items.filter(i=>i.status===status).map(item=><article className={'task-card '+(status==='done'?'completed':'')} key={item.id}><Checkbox className="task-check" checked={status==='done'} onCheckedChange={()=>toggle(item)} disabled={busy!==null}/><button className="task-main" onClick={()=>openItem(item)}><h3>{item.name}</h3><div className="task-meta"><span><strong>כמות:</strong> {item.quantity||'1'}</span>{item.notes&&<span>{item.notes}</span>}</div><span className="updated">עודכן על ידי {item.updated_by}</span></button><div className="task-actions"><button className="icon-button" onClick={()=>openItem(item)}><Pencil size={17}/></button><button className="icon-button danger" onClick={()=>setDeleting(item)}><Trash2 size={17}/></button></div></article>)}</div>}</TabsContent>)}
  </Tabs></main>
  <Dialog open={editor} onOpenChange={o=>{if(!saving)setEditor(o)}}><DialogContent className="task-dialog" showCloseButton={false} dir="rtl"><div className="modal-heading"><div><DialogTitle>{editing?'עריכת מוצר':'מוצר חדש'}</DialogTitle><DialogDescription>הוסיפו מוצר, כמות והאם צריך אותו עכשיו או בהמשך.</DialogDescription></div><button className="icon-button" onClick={()=>setEditor(false)}><X size={20}/></button></div><form onSubmit={save}><label htmlFor="shopping-name">שם המוצר *</label><input id="shopping-name" autoFocus required maxLength={160} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="למשל, חלב"/><div className="form-grid"><div><label htmlFor="shopping-quantity">כמות</label><input id="shopping-quantity" maxLength={80} value={draft.quantity} onChange={e=>setDraft({...draft,quantity:e.target.value})} placeholder="למשל, 2 יחידות"/></div><div><label htmlFor="shopping-status">רשימה</label><select id="shopping-status" className="form-select" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as ShoppingStatus})}><option value="now">לקנייה עכשיו</option><option value="future">לזכור להמשך</option><option value="done">נקנה</option></select></div></div><label htmlFor="shopping-notes">הערה</label><input id="shopping-notes" maxLength={500} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="למשל, רק 3%"/><div className="form-actions"><button className="primary" type="submit" disabled={saving||!draft.name.trim()}>{saving?<LoaderCircle className="spin" size={18}/>:<Check size={18}/>} {saving?'שומרים…':editing?'שמירת שינויים':'הוספת מוצר'}</button><button className="text-button" type="button" onClick={()=>setEditor(false)}>ביטול</button></div></form></DialogContent></Dialog>
  <AlertDialog open={!!deleting} onOpenChange={o=>{if(!o&&!saving)setDeleting(null)}}><AlertDialogContent dir="rtl"><AlertDialogTitle>למחוק את המוצר?</AlertDialogTitle><AlertDialogDescription>הפריט „{deleting?.name}” יימחק מרשימת הקניות.</AlertDialogDescription><div className="confirm-actions"><AlertDialogAction onClick={remove} className="delete-button">מחיקת מוצר</AlertDialogAction><AlertDialogCancel>ביטול</AlertDialogCancel></div></AlertDialogContent></AlertDialog>{message&&<div className="toast"><CheckCheck size={19}/>{message}</div>}</div>;
}
