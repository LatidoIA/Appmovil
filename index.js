// index.js
import 'react-native-gesture-handler'; // 👈 obligatorio antes de todo
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
