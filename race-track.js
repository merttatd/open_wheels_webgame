(() => {
function build(length,corners){
 const points=[{x:0,y:0,angle:0}],step=2;
 function heading(d){let angle=0;for(const c of corners){const t=Math.max(0,Math.min(1,(d-c.start)/(c.end-c.start)));angle+=c.direction*(.8+(220-c.speed)/170)*(t*t*(3-2*t));}return angle;}
 for(let d=step;d<=length+1000;d+=step){const prev=points[points.length-1],a=heading(d-step/2);points.push({x:prev.x+Math.cos(a)*step,y:prev.y+Math.sin(a)*step,angle:heading(d)});}
 return {at(d){if(d<0)return{x:d,y:0,angle:0};const endDistance=(points.length-1)*step;if(d>endDistance){const end=points[points.length-1],extra=d-endDistance;return{x:end.x+Math.cos(end.angle)*extra,y:end.y+Math.sin(end.angle)*extra,angle:end.angle};}const i=Math.min(points.length-2,Math.floor(d/step)),t=Math.max(0,Math.min(1,(d-i*step)/step)),a=points[i],b=points[i+1];return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+(b.angle-a.angle)*t};}};
}
window.RaceTrack={build};
})();