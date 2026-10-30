import Grid from './vendor/pathfinding/Grid.mjs';
import BreadthFirstFinder from './vendor/pathfinding/BreadthFirstFinder.mjs';
// Fresh grid per search: upstream mutates nodes. Never accept blocked endpoints.
export function gridPath(matrix,start,end){
 const h=matrix.length,w=matrix[0]?.length;
 if(!w||matrix.some(row=>row.length!==w)||[start,end].some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n))||p[0]<0||p[0]>=w||p[1]<0||p[1]>=h||matrix[p[1]][p[0]]))return [];
 return new BreadthFirstFinder({allowDiagonal:false}).findPath(...start,...end,new Grid(matrix));
}
