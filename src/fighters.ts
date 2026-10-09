import type { Action } from './combat';
export const fighters = [
  { key: 'moon', name: 'MOON RONIN', color: '#89d9e2' },
  { key: 'ember', name: 'EMBER BRAWLER', color: '#f2a163' },
] as const;
export const frameCounts: Record<Action, number> = {
  idle: 2, walk: 3, run: 8, jump: 2, attack: 10, kick: 10,
  sword_attack: 6, ground_slide: 2, hurt: 1, death: 1,
};
export const actions = Object.keys(frameCounts) as Action[];

// Contact is frame 3 for the six-frame slash and frame 5 for ten-frame strikes.
export function attackFrame(time: number, active: number, duration: number, count = 10): number {
  const contact = count === 6 ? 2 : 4;
  if (time < active) return Math.min(contact - 1, Math.floor(Math.max(0, time) / active * contact));
  return Math.min(count - 1, contact + Math.floor((time - active) / (duration - active) * (count - contact)));
}

export function spriteFile(character:'moon'|'ember',action:Action):string{
 if(character==='ember'&&action==='idle')return 'idle-ronin.png';
 if(action==='sword_attack')return 'sword_attack-six.png';
 if(['run','attack','kick'].includes(action))return `${action}-v2.png`;
 return `${action}.png`;
}
