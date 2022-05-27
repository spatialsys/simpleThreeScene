import * as ReactDOMClient from 'react-dom/client';
import TeleportRouter from './Router';

// css
import './css/App.css';
import './css/Animations.css';

const root = ReactDOMClient.createRoot(document.getElementById('root'));
root.render(<TeleportRouter />);