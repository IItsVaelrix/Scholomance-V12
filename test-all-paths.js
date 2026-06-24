function wordBreakAll(s, wordDict) {
  const memo = new Map();
  function dfs(start) {
    if (start === s.length) return [[]];
    if (memo.has(start)) return memo.get(start);
    const res = [];
    for (let i = start + 1; i <= s.length; i++) {
      const word = s.slice(start, i);
      if (wordDict.has(word)) {
        const nextPaths = dfs(i);
        for (const path of nextPaths) {
          res.push([word, ...path]);
        }
      }
    }
    memo.set(start, res);
    return res;
  }
  return dfs(0);
}

const dict = new Set(["FALLS", "IN", "LINE", "FALL", "SIN", "AWKWARD", "MIND", "AWK", "WARD", "A", "I"]);
console.log(wordBreakAll("FALLSINLINE", dict));
console.log(wordBreakAll("AWKWARDMIND", dict));
