import type { GameState } from '../../domain/GameState';
import { commissionDefinitions } from '../../data/commissions';
import { npcs, type NpcId } from '../../data/npcs';
import { acceptCommission, deliverCommission, claimCommission, commissionProgress, ensureDailyCommissions } from '../../domain/village';
import { appendItem } from './itemDisplay';
const statusLabels = {available:'可接取',accepted:'进行中',completed:'已交付 · 待领奖',rewarded:'已领取奖励'};
export class CommissionPanel {
  private readonly list = document.createElement('div');
  private readonly feedback = document.createElement('p');
  constructor(card:HTMLElement,private readonly state:GameState,private readonly changed:()=>void,private readonly npc?:NpcId) {
    ensureDailyCommissions(state); const title=document.createElement('h2'); title.textContent=npc ? `${npcs[npc].name}的委托`:'村庄委托';
    const note=document.createElement('p'); note.className='panel-help'; note.textContent='每天更新两项委托。已接取的委托保留；带齐物品找委托人交付，再领取奖励。';
    this.feedback.setAttribute('role','status'); this.feedback.tabIndex=-1; this.list.className='commission-list'; card.append(title,note,this.list,this.feedback); this.render();
  }
  private render():void {
    this.list.replaceChildren();
    const quests=this.state.village.commissions.filter(q=>!this.npc || commissionDefinitions[q.definitionId].npcId===this.npc);
    for(const q of quests){
      const d=commissionDefinitions[q.definitionId], progress=commissionProgress(this.state,q.id)!;
      const row=document.createElement('article'); row.className='commission-row';
      const title=document.createElement('h3'); title.textContent=`${d.title} · ${statusLabels[q.status]}`;
      const details=document.createElement('p'); details.textContent=`委托人：${npcs[d.npcId].name} · ${d.rewardCoins} 金币 / ${d.rewardFriendship} 好感度`;
      const item=document.createElement('div'); item.className='commission-item'; appendItem(item,d.itemId,d.quantity);
      const count=document.createElement('span'); count.textContent=`进度 ${progress.held}/${progress.required}`; item.append(count);
      row.append(title,details,item);
      const action=q.status==='available'?'接取委托':q.status==='accepted'&&this.npc?'交付物品':q.status==='completed'&&this.npc?'领取奖励':undefined;
      if(action){ const button=document.createElement('button'); button.type='button'; button.className='compact-button'; button.textContent=action;
        button.addEventListener('click',()=>{button.disabled=true;
          const result=q.status==='available'?acceptCommission(this.state,q.id):q.status==='accepted'?deliverCommission(this.state,q.id,this.npc!):claimCommission(this.state,q.id,this.npc!);
          this.feedback.textContent=result.message; this.changed(); this.render();
          const replacement = this.list.querySelector<HTMLElement>(`[data-quest="${q.id}"] button`);
          (replacement ?? this.list.parentElement?.querySelector<HTMLElement>('.panel-close'))?.focus();
        }); row.append(button); }
      row.dataset.quest=q.id; this.list.append(row);
    }
    if(!quests.length){const p=document.createElement('p');p.textContent='目前没有这位村民的委托，看看公告栏的新消息吧。';this.list.append(p);}
  }
}
