import { buildings } from '../../data/buildings';
import { items } from '../../data/items';
import type { GameState } from '../../domain/GameState';
import { removeBuilding, type BuildMode } from '../../domain/buildings';
import { countItem } from '../../domain/inventory';
import { craftBuilding } from '../../domain/gathering';
export class BuildingPanel {
  private readonly content=document.createElement('div');private feedback='';
  constructor(root:HTMLElement,private readonly state:GameState,private readonly changed:()=>void,private readonly select:(mode:BuildMode)=>void,shop:()=>void) {
    root.append(this.content);this.render();const b=this.button('购买建筑组件',shop);root.append(b);
  }
  private button(label:string,action:()=>void):HTMLButtonElement {const b=document.createElement('button');b.className='compact-button';b.textContent=label;b.onclick=action;return b;}
  private render():void {
    this.content.replaceChildren();const h=document.createElement('h2');h.textContent='农场建筑';
    const note=document.createElement('p');note.textContent='选择组件后，走到空地，按 E 放置面前网格。绿色可放，红色不可放。Esc 取消。可在此移动或拆除自己放置的建筑。';this.content.append(h,note);
    for(const kind of ['fence','lamp','bench'] as const) {
      const d=buildings[kind];const b=this.button(`放置${d.name} · ${countItem(this.state,d.kit)} 个 · ${items[d.kit].buyPrice} 金币/个`,()=>this.select({kind}));b.disabled=countItem(this.state,d.kit)<1;this.content.append(b);
      const recipe=Object.entries(d.materials).map(([id,n])=>`${items[id as keyof typeof items].name} ${n}`).join(' + ');
      this.content.append(this.button(`制作${d.name} · ${recipe}`,()=>{this.feedback=craftBuilding(this.state,kind).message;this.changed();this.render();}));
    }
    for(const b of this.state.expansion.buildings) {
      const row=document.createElement('div');row.className='livestock-row';row.textContent=`${buildings[b.kind].name} #${b.id} · 网格 ${b.x},${b.y}`;
      row.append(this.button(`移动 #${b.id}`,()=>this.select({kind:b.kind,movingId:b.id})),this.button(`拆除 #${b.id}`,()=>{this.feedback=removeBuilding(this.state,b.id).message;this.changed();this.render();}));this.content.append(row);
    }
    const result=document.createElement('p');result.setAttribute('role','status');result.textContent=this.feedback;this.content.append(result);
  }
}
