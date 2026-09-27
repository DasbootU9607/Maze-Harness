// Two distinct causal structures. The old parameter-only constructor is untouched.
const assert=require('node:assert/strict');
const {saveDraft}=require('./draft-io.cjs');
const hook=[[5,5],[6,5],[5,6],[5,7],[5,8],[6,8]];
function board(fill){return Array.from({length:16},()=>Array(16).fill(fill));}
function repairPlate(){
 const cells=board('.+#'),put=(x,y,t)=>{cells[y][x]=t;};
 for(let y=4;y<=8;y++)for(let x=5;x<=6;x++)put(x,y,'.');
 for(let y=5;y<=8;y++)for(let x=8;x<=10;x++)put(x,y,'.');
 put(7,5,'.');put(7,6,'+');
 for(const [x,y]of hook)put(x,y,'.+M0');
 put(6,7,'.+M1');put(6,6,'.+o');
 put(8,6,'.+f');put(9,6,'.+p');
 put(9,9,'.+O');put(9,10,'.+G');
 return {scenario:'repair-plate',title:'Hook Structure - Repair and Hold',cells,contract:{
  scenario:'repair-plate',hookGroup:'M0',payloadGroup:'M1',boxElevation:0,
  actuationStand:[6,6,0],transferDestination:[6,6,0],repairCell:[7,6],plateCell:[6,6],gateCell:[9,9],
  necessary:['no_rear_transfer','no_floor_fill','no_payload_plate'],
  permissive:['no_post_transfer_box_motion'],prerequisite:'no_floor_fill'}};
}
function elevatedBridge(){
 const high=['.','#','#','#'].join('+'),cells=board('+'),put=(x,y,t)=>{cells[y][x]=t;};
 for(let i=0;i<16;i++){put(i,0,high);put(i,15,high);put(0,i,high);put(15,i,high);}
 for(let y=3;y<=9;y++)put(4,y,high);
 for(const y of [3,4,7,8,9])put(7,y,high);
 for(const x of [5,6]){put(x,3,high);put(x,9,high);}
 for(let y=4;y<=8;y++)for(let x=5;x<=6;x++)put(x,y,'.+#');
 for(const [x,y]of hook)put(x,y,'.+#+M0');
 put(6,7,'.+#+M1');put(7,5,'.+#');
 put(7,6,'.+#+L');
 for(let x=8;x<=11;x++)put(x,6,'.+#+#');
 put(11,7,'.+#+Su#');put(11,8,'.+Su#');put(11,9,'.+p');
 put(4,6,['.','#','#','G'].join('+'));
 return {scenario:'elevated-bridge',title:'Hook Structure - Lower and Bridge',cells,contract:{
  scenario:'elevated-bridge',hookGroup:'M0',payloadGroup:'M1',boxElevation:1,
  actuationStand:[6,6,1],transferDestination:[6,6,1],liftCell:[7,6],bridgeCell:[6,6],gemCell:[4,6,2],
  necessary:['no_rear_transfer','no_player_height_change','no_lift_lower','no_lift_raise','no_payload_top_walk'],
  permissive:['no_post_transfer_box_motion'],prerequisite:'no_lift_lower'}};
}
const scenarios={'repair-plate':repairPlate,'elevated-bridge':elevatedBridge};
if(require.main===module){const a=process.argv.slice(2),get=(k,f)=>a.includes(k)?a[a.indexOf(k)+1]:f;
 const scenario=get('--scenario');assert(scenarios[scenario],'--scenario repair-plate | elevated-bridge');
 assert(get('--out'),'--out must name a fresh artifact directory');
 console.log(JSON.stringify(saveDraft(get('--repo',process.cwd()),get('--out'),scenarios[scenario]()),null,2));
}
module.exports={scenarios};
