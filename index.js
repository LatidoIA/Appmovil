// index.js (punto de entrada)
import './crash'; // ganchos de crash MUY temprano
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
