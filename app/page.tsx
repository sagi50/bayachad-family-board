import Board from './board';

export default function Home() {
  return <>
    <a
      href="/shopping"
      aria-label="פתיחת רשימת הקניות"
      style={{position:'fixed',left:20,bottom:20,zIndex:40,padding:'12px 18px',borderRadius:999,background:'#111827',color:'white',fontWeight:700,textDecoration:'none',boxShadow:'0 8px 24px rgba(0,0,0,.18)'}}
    >
      רשימת קניות
    </a>
    <Board />
  </>;
}
