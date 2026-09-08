import { createRoot } from 'react-dom/client';
import { DirectionProvider } from '@/components/ui/direction';
import SessionGate from './session';
import './globals.css';
createRoot(document.getElementById('root')!).render(<DirectionProvider direction="rtl"><SessionGate /></DirectionProvider>);
