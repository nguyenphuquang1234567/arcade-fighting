// Match An clothing/limb silhouettes to the corresponding Yuki jump frames.
// A shared scale preserves the same body proportions across both frames.
export function jumpOffset(character:string,frame:number){
 if(character==='an')return frame===0?{x:1,y:3,scale:247/256}:{x:-6,y:1,scale:247/256};
 return {x:46,y:17,scale:1};
}
