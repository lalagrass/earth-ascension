// Shared with #351: the raw journal has no historical visibility record.
// Seeing a wild/cave actor now cannot disclose their earlier private events.
export function gptJournalVisible(world, event) {
  return event.visibility !== 'hidden' && (event.actors || []).every(id => {
    const p = world.people[id];
    return p && !p.inactive && !['wild', 'cave', 'departed'].includes(p.residence);
  });
}
