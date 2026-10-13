import type { GameState } from '../../domain/GameState';
import { animals, type AnimalKind } from '../../data/animals';
import { buyAnimal, feedAnimal, collectAnimal } from '../../domain/animals';
import { countItem, type InventoryResult } from '../../domain/inventory';
import { appendItem } from './itemDisplay';
export class LivestockPanel {
  private readonly content=document.createElement('div');
  private feedback='';
  constructor(root:HTMLElement, private readonly state:GameState, private readonly kind:AnimalKind, private readonly changed:()=>void, shop:()=>void) {
    root.append(this.content);this.render();
    const b=document.createElement('button');b.className='compact-button';b.textContent='购买饲料 / 出售产物';b.onclick=shop;root.append(b);
  }
  private button(label:string, action:()=>InventoryResult):HTMLButtonElement {
    const b=document.createElement('button');b.className='compact-button';b.textContent=label;
    b.onclick=()=>{this.feedback=action().message;this.changed();this.render();};return b;
  }
  private render():void {
    const d=animals[this.kind],s=this.state, owned=s.expansion.animals.filter(a=>a.kind===this.kind);
    this.content.replaceChildren();
    const h=document.createElement('h2');h.textContent=this.kind==='chicken'?'鸡舍 · 动物养殖':'谷仓 · 动物养殖';
    const p=document.createElement('p');p.textContent=`金币 ${s.coins} · 饲料 ${countItem(s,'feed')} · ${owned.length}/${d.capacity} 只。每天喂一份，次日产一份；未收取产物保留。`;
    this.content.append(h,p,this.button(`购买${d.name} · ${d.price} 金币`,()=>buyAnimal(s,this.kind,s.nextTradeId)));
    for(const a of owned) {
      const row=document.createElement('div');row.className='livestock-row';appendItem(row,d.product,Number(a.productReady));
      const text=document.createElement('span');text.textContent=`${d.name} #${a.id} · 饥饿 ${a.hunger}/100 · 好感 ${a.friendship}/100 · ${a.fedOn===s.day?'今日已喂':'今日未喂'} · ${a.productReady?'可收取':'等待生产'}`;
      row.append(text,this.button(`喂食 #${a.id}`,()=>feedAnimal(s,a.id)),this.button(`收取 #${a.id}`,()=>collectAnimal(s,a.id)));this.content.append(row);
    }
    const f=document.createElement('p');f.setAttribute('role','status');f.textContent=this.feedback;this.content.append(f);
  }
}
