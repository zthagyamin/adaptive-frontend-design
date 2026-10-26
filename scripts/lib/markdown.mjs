// Local documentation checks, not a complete Markdown renderer.
export function withoutFencedCode(text) {
  let fence=null;
  return text.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>{
    const match=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if(fence){
      if(match&&match[1][0]===fence.character&&match[1].length>=fence.length&&!match[2].trim())fence=null;
      return '';
    }
    if(match){fence={character:match[1][0],length:match[1].length};return '';}
    return line;
  }).join('\n');
}

function unescapeHtml(text) {
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(original,value)=>{
    if(value[0]!=='#')return named[value.toLowerCase()];
    const code=value[1].toLowerCase()==='x'?parseInt(value.slice(2),16):Number(value.slice(1));
    return code>0&&code<=0x10ffff?String.fromCodePoint(code):original;
  });
}

export function anchorsFor(text,{markdown=true}={}) {
  const source=markdown?withoutFencedCode(text).replace(/^---\n[\s\S]*?\n---(?:\n|$)/,''):text;
  const anchors=new Set(),headings=new Set();
  for(const tag of source.replace(/(`+)[\s\S]*?\1(?!`)/g,'').matchAll(/<([a-z][^<>]*)>/gi)){
    const attributes=/^a\b/i.test(tag[1])?'(?:id|name)':'id';
    const attribute=tag[1].match(new RegExp('\\s'+attributes+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));
    if(attribute)anchors.add(unescapeHtml(attribute[1]??attribute[2]??attribute[3]));
  }
  if(!markdown)return anchors;
  const lines=source.split('\n');
  function heading(value){
    const plain=unescapeHtml(value.replace(/<[^>]*>/g,'').replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\\([\p{P}\p{S}])/gu,'$1').replace(/`+/g,'').replace(/__(.*?)__/g,'$1').replace(/(?<!\w)_(.+?)_(?!\w)/g,'$1'));
    const base=plain.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu,'').replace(/\s/g,'-');
    let slug=base,index=0;while(headings.has(slug))slug=base+'-'+(++index);
    headings.add(slug);anchors.add(slug);
  }
  for(let i=0;i<lines.length;i++){
    const atx=lines[i].match(/^ {0,3}#{1,6}(?:[\t ]+(.+?)|[\t ]*)$/);
    if(atx){heading((atx[1]||'').replace(/[\t ]+#+[\t ]*$/,'').trim());continue;}
    if(i>0&&/^ {0,3}(?:=+|-+)\s*$/.test(lines[i])&&lines[i-1].trim()&&!/^ {0,3}(?:>|[-*+] |#{1,6} )/.test(lines[i-1]))heading(lines[i-1].trim());
  }
  return anchors;
}

export function markdownLinks(text) {
  const source=withoutFencedCode(text).replace(/(`+)[\s\S]*?\1(?!`)/g,'');
  const links=[];
  for(let start=0;start<source.length;start++){
    if(source[start]!=='['||source[start-1]==='\\')continue;
    let end=start+1,depth=1;
    for(;end<source.length&&depth;end++){
      if(source[end]==='\\'){end++;continue;}
      if(source[end]==='[')depth++;
      if(source[end]===']')depth--;
    }
    if(depth||source[end]!=='(')continue;
    let close=end+1,parens=1,angle=false,quote=null;
    for(;close<source.length&&parens;close++){
      const character=source[close];
      if(character==='\\'){close++;continue;}
      if(quote){if(character===quote)quote=null;continue;}
      if(angle){if(character==='>')angle=false;continue;}
      if(character==='<'){angle=true;continue;}
      if((character==='"'||character==="'")&&/\s/.test(source[close-1])){quote=character;continue;}
      if(character==='(')parens++;
      if(character===')')parens--;
    }
    if(parens)continue;
    const value=source.slice(end+1,close-1).trim();
    const target=value.match(/^(?:<([^>]+)>|(\S+?))(?:\s+["'][\s\S]*["'])?$/);
    if(target)links.push({target:(target[1]??target[2]).replace(/\\([()])/g,'$1'),image:source[start-1]==='!'});
  }
  return links;
}
