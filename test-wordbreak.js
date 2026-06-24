function wordBreak(s, wordDict) {
  const dp = Array(s.length + 1).fill(null);
  dp[0] = [];
  
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] !== null && wordDict.has(s.slice(j, i))) {
        if (!dp[i]) dp[i] = [];
        dp[i].push({ prev: j, word: s.slice(j, i) });
      }
    }
  }
  
  if (dp[s.length] === null) return [];
  
  // Reconstruct one path for now
  const result = [];
  let curr = s.length;
  while (curr > 0) {
    const node = dp[curr][0]; // just take first
    result.unshift(node.word);
    curr = node.prev;
  }
  return result;
}

const dict = new Set(["FALLS", "IN", "LINE", "AWKWARD", "MIND", "SLAUGHTERED", "SPINES", "FALL", "SIN"]);
console.log(wordBreak("FALLSINLINE", dict));
console.log(wordBreak("AWKWARDMIND", dict));
