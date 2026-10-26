import { listProfiles, presentCard } from './profiles.mjs';
import { renderCard } from './render.mjs';
import { resourcesHtml } from '../resource-view/render.mjs';
import { intentHtml } from '../intent-view/render.mjs';
import { recentHtml } from '../event-view/render.mjs';
import { createViewWriter } from '../public-fix/view-state.mjs';
import { previewFixtures } from '../public-ui/preview-fixtures.mjs';

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

const fixtures = previewFixtures(), put = createViewWriter();
document.querySelector('#fixture-card').innerHTML = renderCard(fixtures.card);
document.querySelector('#fixture-resources').innerHTML = resourcesHtml(fixtures.resources);
const fixtureIntent = document.querySelector('#fixture-intent');
const drawIntent = result => put('fixture-intent',fixtureIntent,intentHtml(fixtures.intent,{result}),'fixture');
drawIntent('示意命令結果：尚未操作（非本局）');
fixtureIntent.addEventListener('click',event => {
 if(event.target.closest('[data-intent-command="fixture:enabled"]')) drawIntent('示意命令結果：按鈕可操作；未送往任何核心。');
});
const fixtureEvents = document.querySelector('#fixture-events');
const drawEvents = (category = 'all',expanded = true) => {
 fixtureEvents.innerHTML = recentHtml(category === 'all' || category === 'life' ? fixtures.events : [],{category,expanded});
};
drawEvents();
fixtureEvents.addEventListener('click',event => {
 const filter = event.target.closest('[data-event-filter]');
 if(filter) drawEvents(filter.dataset.eventFilter);
 if(event.target.closest('[data-ui="toggleEvents"]')) drawEvents('all',event.target.getAttribute('aria-expanded') !== 'true');
});
