import Board from './board';

export default function Home() {
  return <>
    <a href="/shopping" className="shopping-fab" aria-label="פתיחת רשימת הקניות">רשימת קניות</a>
    <Board />
  </>;
}
