import { isValidVote, G2P_JUROR_IDS } from '../schemas.js';

function scoreGraph(candidate, tokenGraph) {
  if (!candidate || !Array.isArray(candidate.phonemes)) {
    return null;
  }

  const word = candidate.word || '';
  const phonemeString = candidate.phonemes.join(' ');

  let graphScore = 0.5;

  if (tokenGraph && typeof tokenGraph === 'object') {
    const edges = tokenGraph.edges || tokenGraph.adjacency || [];
    let matchCount = 0;

    for (const edge of edges) {
      const source = edge.source || edge.from || '';
      const target = edge.target || edge.to || '';
      if (
        source === word ||
        target === word ||
        source === phonemeString ||
        target === phonemeString
      ) {
        matchCount += (edge.weight || 0.1);
      }
    }

    graphScore = matchCount > 0 ? clamp01(matchCount / (edges.length || 1)) : 0.5;
  }

  const confidence = clamp01(graphScore);

  return {
    candidateKey: candidate.phonemes.join(' '),
    jurorId: G2P_JUROR_IDS.GRAPH,
    tokenWeight: 0.5,
    confidence,
    stageSignal: 1,
    syntaxModifier: 1,
    rationale: `Graph edge match score: ${graphScore.toFixed(4)} on ${tokenGraph ? 'provided token graph' : 'missing token graph'}.`,
    fidelityGrade: 'B',
  };
}

export function createGraphJuror(tokenGraph) {
  const graph = tokenGraph || null;

  return {
    id: G2P_JUROR_IDS.GRAPH,
    vote(candidate) {
      const vote = scoreGraph(candidate, graph);
      if (!vote || !isValidVote(vote)) return null;
      return vote;
    },
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
