export const AN_BLOCK_FRAMES=82;
export const AN_BLOCK_DURATION=AN_BLOCK_FRAMES/24;
// Character crown-to-sole: source 176..674, idle 119..491.
// Pages contain the source at 60%; idle renders at 60%.
export const AN_BLOCK_SCALE=372/498;
// Foot-stance midpoint x=626 -> idle x=265; soles y=674 -> idle y=491.
export const AN_BLOCK_ORIGIN_X=626*.6-(265-256)*.6/AN_BLOCK_SCALE;
export const AN_BLOCK_ORIGIN_Y=674*.6+(512-491)*.6/AN_BLOCK_SCALE;
