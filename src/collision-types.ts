export type Point={x:number;y:number};
export type BodyRegion='head'|'body'|'legs';
export type HurtPolygon={region:BodyRegion;points:Point[];holes?:Point[][]};
