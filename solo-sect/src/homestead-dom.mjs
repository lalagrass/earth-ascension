// UI only: these containers are owned by one renderer, never editable subtrees.
// Remember the original string: DOM serialization normalizes boolean attributes.
const lastMarkup=new WeakMap();
export function renderMarkup(element,markup){
 if(lastMarkup.get(element)===markup)return false;
 element.innerHTML=markup;lastMarkup.set(element,markup);return true;
}
