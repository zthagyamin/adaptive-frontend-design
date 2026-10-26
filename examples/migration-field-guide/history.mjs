// Only entries created by this live document can authorize a multi-entry return.
// A refreshed/shared detail has no proven earlier manual entry, even if its
// serialized history.state contains a depth left by another document lifetime.
export function createReaderHistory(visit=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`){
  const entries=new Map();let sequence=0;
  function remember(hash,depth){const entry=++sequence;entries.set(entry,{hash,depth});return{fieldReaderVisit:visit,fieldReaderEntry:entry}}
  function owned(state,hash){if(state?.fieldReaderVisit!==visit)return null;const entry=entries.get(state.fieldReaderEntry);return entry?.hash===hash?entry:null}
  return{
    origin(hash){return remember(hash,0)},
    detail(state,currentHash,nextHash){const previous=owned(state,currentHash);return remember(nextHash,Number.isInteger(previous?.depth)?previous.depth+1:null)},
    close(state,currentHash,fallbackHash,destination){const entry=owned(state,currentHash);return !destination&&entry?.depth>0?{delta:-entry.depth}:{hash:destination||fallbackHash}}
  };
}
