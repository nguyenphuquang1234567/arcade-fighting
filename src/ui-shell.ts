// Menu focus belongs to the top visible screen; combat input remains in main.ts.
export function installMenuNavigation(){
 const menu=document.querySelector<HTMLElement>('#overlay')!;
 const pause=document.querySelector<HTMLElement>('#pause-menu')!;
 const root=()=>!pause.hidden?pause:!menu.classList.contains('hidden')?menu:undefined;
 const controls=(screen:HTMLElement)=>Array.from(screen.querySelectorAll<HTMLElement>('button:not(:disabled),summary')).filter(e=>e.getClientRects().length>0);
 const focusFirst=()=>{const screen=root();if(screen){const first=screen===pause?screen.querySelector<HTMLElement>('#resume-match'):screen.querySelector<HTMLElement>('.selected');(first??controls(screen)[0])?.focus({preventScroll:true});}};
 const sync=()=>{document.body.dataset.screen=root()===menu?'menu':root()===pause?'pause':'fight';for(const b of Array.from(menu.querySelectorAll('button[data-mode]')))b.setAttribute('aria-pressed',String(b.classList.contains('selected')));};
 new MutationObserver(records=>{sync();if(records.some(r=>r.target===menu||r.target===pause))focusFirst();}).observe(menu,{attributes:true,attributeFilter:['class'],subtree:true});
 new MutationObserver(()=>{sync();focusFirst();}).observe(pause,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('keydown',e=>{const screen=root();if(!screen)return;const list=controls(screen);if(!list.length)return;let i=list.indexOf(document.activeElement as HTMLElement);if(e.key==='Tab'){e.preventDefault();i=(i+(e.shiftKey?-1:1)+list.length)%list.length;list[i].focus();}else if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();i=(i+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)+list.length)%list.length;list[i].focus();}},true);
 // D-pad/stick focus and primary-button activation for menus only.
 let last=0,held=false;
 function pad(now:number){const screen=root();const p=Array.from(navigator.getGamepads?.()??[]).find(Boolean);if(screen&&p){const list=controls(screen);const direction=p.buttons[13]?.pressed||p.buttons[15]?.pressed||p.axes[1]>.55||p.axes[0]>.55?1:p.buttons[12]?.pressed||p.buttons[14]?.pressed||p.axes[1]<-.55||p.axes[0]<-.55?-1:0;if(direction&&now-last>200&&list.length){const i=list.indexOf(document.activeElement as HTMLElement);list[(i+direction+list.length)%list.length].focus();last=now;}if(p.buttons[0]?.pressed&&!held)(document.activeElement as HTMLElement)?.click();held=!!p.buttons[0]?.pressed;}else held=false;requestAnimationFrame(pad);}
 sync();focusFirst();requestAnimationFrame(pad);
}
