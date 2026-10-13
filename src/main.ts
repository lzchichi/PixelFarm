import { createGame } from './game/createGame';
import './style.css';

const parent = document.querySelector<HTMLElement>('#game');
if (!parent) throw new Error('找不到游戏容器');
const game = createGame(parent);
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
