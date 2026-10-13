import { items, type ItemId } from '../../data/items';
import { cropArt } from '../../data/cropArt';
import { artAssets } from '../../data/artAssets';
import animalArt from '../../data/animal-art-manifest.json';
export function appendItem(element: HTMLElement, id: ItemId, quantity: number): void {
  const crop = id.startsWith('seed-') ? id.slice(5) : id;
  if(id==='wild-mushroom'){const image=document.createElement('img');image.src=`${import.meta.env.BASE_URL}${artAssets.objects['mushrooms-red'].path}`;image.alt='';element.append(image,`${items[id].name} ×${quantity}`);return;}
  const asset = id==='kit-fence'?artAssets.objects.fence:id==='kit-lamp'?artAssets.objects.lantern:id==='kit-bench'?artAssets.objects.bench:id === 'feed' || id === 'egg' || id === 'milk' ? animalArt.assets[id] : id === 'wood' ? artAssets.objects['log-moss'] : id === 'stone' ? artAssets.objects['rock-cluster'] : Object.entries(cropArt.assets).find(([key]) => key === `${crop}-harvest`)?.[1];
  if (asset) {
    const image = document.createElement('img'); image.src = `${import.meta.env.BASE_URL}${asset.path}`; image.alt = ''; element.append(image);
  }
  const label = document.createElement('span'); label.textContent = `${items[id].name} ×${quantity}`; element.append(label);
}
