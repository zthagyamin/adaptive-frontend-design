// Original, dependency-free geometry helpers. CSS pixels, not drawing-buffer pixels.
// Assumes a centered perspective frustum and axis-aligned DOM bounds; see projection-and-dom.md.
const degrees=180/Math.PI;
function positive(value,name){if(!Number.isFinite(value)||value<=0)throw new RangeError(`${name} must be finite and positive`);return value;}
function bounds(value,allowEmpty=false){
  if(!value)throw new TypeError('A rectangle is required');
  const left=value.left??value.x,top=value.top??value.y,width=value.width,height=value.height;
  if(![left,top,width,height].every(Number.isFinite))throw new TypeError('Rectangle values must be finite');
  if(width<0||height<0||(!allowEmpty&&(width===0||height===0)))throw new RangeError('Rectangle dimensions must be positive');
  return {left,top,width,height};
}
export function fovForPlaneHeight(height,distance,zoom=1){
  const fov=2*Math.atan(positive(height,'height')*positive(zoom,'zoom')/(2*positive(distance,'distance')))*degrees;
  if(fov<=0||fov>=180)throw new RangeError('Projection is outside the representable FOV range');
  return fov;
}
export function planeForDomRect({canvas,rect,distance,fov,zoom=1}){
  const c=bounds(canvas),r=bounds(rect,true);positive(distance,'distance');positive(zoom,'zoom');
  if(!Number.isFinite(fov)||fov<=0||fov>=180)throw new RangeError('fov must be between 0 and 180 degrees');
  if(!r.width||!r.height)return null;
  const unitsPerPixel=2*distance*Math.tan(fov/(2*degrees))/(zoom*c.height);
  return {position:[(r.left-c.left+r.width/2-c.width/2)*unitsPerPixel,(c.height/2-(r.top-c.top+r.height/2))*unitsPerPixel,-distance],width:r.width*unitsPerPixel,height:r.height*unitsPerPixel};
}
export function viewportForDomRect(canvas,rect){
  const c=bounds(canvas),r=bounds(rect,true),x=r.left-c.left,y=r.top-c.top;
  const clamp=(v,max)=>Math.min(max,Math.max(0,v));
  const left=clamp(x,c.width),right=clamp(x+r.width,c.width),top=clamp(y,c.height),bottom=clamp(y+r.height,c.height);
  const width=Math.max(0,right-left),height=Math.max(0,bottom-top);
  return {viewport:[x,c.height-y-r.height,r.width,r.height],scissor:[left,c.height-bottom,width,height],aspect:r.height&&r.width?r.width/r.height:null,visible:width>0&&height>0};
}
