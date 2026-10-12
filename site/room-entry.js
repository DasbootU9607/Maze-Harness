// Only direct navigation uses an arrival actor. Neighbor transitions consume
// the unmodified room JSON through the original engine.
export function withDirectEntry(state, catalog) {
  if (state.gameId !== 'maze' || state.actors.some(a => a.type === 'player' || a.type === 'circle_player')) return state;
  const entry = catalog.rooms.find(room => 'level_' + room.id === state.levelId)?.directEntry;
  if (!entry) throw new Error('This room has no direct entry. Enter it through an adjacent room.');
  return { ...state, actors: [...state.actors, {type:'player',label:'Player',x:entry.x,y:entry.y,elevation:entry.elevation,groupId:null,imageUrl:null,modelUrl:null,direction:null,removed:false}], directEntry: entry };
}
