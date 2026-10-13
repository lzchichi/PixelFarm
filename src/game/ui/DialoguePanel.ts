import type { GameState } from '../../domain/GameState';
import { npcs, type NpcId } from '../../data/npcs';
import townArt from '../../data/town-art-manifest.json';
import { talkToNpc, npcPosition } from '../../domain/village';
export class DialoguePanel {
  private timer?: ReturnType<typeof setInterval>;
  constructor(card:HTMLElement,state:GameState,id:NpcId,changed:()=>void,close:()=>void,quests:()=>void,shop:()=>void) {
    talkToNpc(state,id); changed(); const npc=npcs[id];
    const title=document.createElement('h2');title.textContent=`${npc.name} · ${npc.role}`;
    const meta=document.createElement('p');meta.className='panel-help';meta.textContent=`${npc.personality} · 好感度 ${state.village.friendship[id]}/100 · ${npcPosition(id,state.minute).place}`;
    const portrait=document.createElement('img');portrait.src=`${import.meta.env.BASE_URL}${townArt.npcs[id].portrait}`;portrait.alt=npc.name;
    const text=document.createElement('p');text.className='dialogue-text';text.setAttribute('aria-live','polite');
    const body=document.createElement('div');body.className='dialogue-body';body.append(portrait,text);
    const actions=document.createElement('div');actions.className='dialogue-actions';let page=0,letters=0;
    const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className='compact-button';b.addEventListener('click',action);actions.append(b);return b;};
    const render=()=>{clearInterval(this.timer);letters=0;text.textContent='';next.textContent=page===npc.dialogue.length-1?'结束对话':'继续';
      this.timer=setInterval(()=>{letters++;text.textContent=npc.dialogue[page]!.slice(0,letters);if(letters>=npc.dialogue[page]!.length)clearInterval(this.timer);},35);};
    const next=button('继续',()=>{if(letters<npc.dialogue[page]!.length){letters=npc.dialogue[page]!.length;text.textContent=npc.dialogue[page]!;clearInterval(this.timer);}else if(page<npc.dialogue.length-1){page++;render();}else close();});
    button('查看委托',quests); if(id==='lin-seed')button('购买 / 出售',shop);
    card.append(title,meta,body,actions);card.classList.add('dialogue-card');render();
  }
  destroy():void { clearInterval(this.timer); }
}
