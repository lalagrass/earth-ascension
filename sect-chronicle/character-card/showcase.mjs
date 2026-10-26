import { listProfiles, presentCard } from './profiles.mjs';
import { renderCard } from './render.mjs';

const select = document.querySelector('#who');
const groups = new Map();
for (const item of listProfiles()) {
  const label = item.catalog === 'life' ? '生活入口已有的人' : item.work;
  if (!groups.has(label)) groups.set(label, []);
  groups.get(label).push(item);
}
for (const [label, items] of groups) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.profileId;
    option.textContent = item.displayName;
    group.append(option);
  }
  select.append(group);
}
const draw = () => { document.querySelector('#card').innerHTML = renderCard(presentCard(select.value)); };
select.addEventListener('change', draw);
draw();
