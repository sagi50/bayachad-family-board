import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db/raw';
import { InputError, validateTask, validateReference } from '@/lib/task-validation';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET() {
 try { const user=await getChatGPTUser(); if(!user)return json({error:'נדרשת כניסה ללוח.'},401);
 const result=await database().prepare('SELECT id,title,details,topic,due,assignee,status,updated_at,updated_by,version FROM tasks ORDER BY CASE WHEN due = ? THEN 1 ELSE 0 END, due ASC, updated_at DESC').bind('').all();
 return json({tasks:result.results,user:user.displayName,local:process.env.NODE_ENV==='development'});
 }catch{ return json({error:'לא הצלחנו לטעון את המשימות. נסו שוב בעוד רגע.'},503); }
}
async function write(request:Request,method:string) {
 try {
  const user=await getChatGPTUser();if(!user)return json({error:'נדרשת כניסה ללוח.'},401);
  const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'הבקשה לא הגיעה מהלוח שלנו.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'סוג הבקשה אינו תקין.'},415);
  const raw=await request.text();if(raw.length>48000)return json({error:'המשימה ארוכה מדי.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'הבקשה אינה תקינה.'},400);}
  const db=database();
  if(method==='DELETE') {const {id,version}=validateReference(body);const result=await db.prepare('DELETE FROM tasks WHERE id=? AND version=?').bind(id,version).run();if(!result.meta.changes)return conflict();return json({ok:true});}
  const t=validateTask(body);const at=new Date().toISOString();
  if(method==='POST') {const id=crypto.randomUUID();await db.prepare('INSERT INTO tasks (id,title,details,topic,due,assignee,status,updated_at,updated_by,updated_user_id,version) VALUES (?,?,?,?,?,?,?,?,?,?,1)').bind(id,t.title,t.details,t.topic,t.due,t.assignee,t.status,at,user.displayName,user.userId).run();return json({ok:true,id},201);}
  const {id,version}=validateReference(body);const result=await db.prepare('UPDATE tasks SET title=?,details=?,topic=?,due=?,assignee=?,status=?,updated_at=?,updated_by=?,updated_user_id=?,version=version+1 WHERE id=? AND version=?').bind(t.title,t.details,t.topic,t.due,t.assignee,t.status,at,user.displayName,user.userId,id,version).run();if(!result.meta.changes)return conflict();return json({ok:true,id});
 }catch(e){return e instanceof InputError?json({error:e.message},400):json({error:'השינוי לא נשמר. נסו שוב בעוד רגע.'},503);}
}
function conflict(){return json({error:'המשימה השתנתה מאז שפתחתם אותה. סגרו ופתחו אותה מחדש כדי לראות את העדכון האחרון; הטקסט שהקלדתם עדיין כאן להעתקה.'},409);}
export const POST=(r:Request)=>write(r,'POST');
export const PATCH=(r:Request)=>write(r,'PATCH');
export const DELETE=(r:Request)=>write(r,'DELETE');
