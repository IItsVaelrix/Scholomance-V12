/**
 * Frozen stopword set for keyword extraction (PDR §13, Step 3).
 *
 * ~150 common English function words plus résumé-boilerplate filler. These are
 * dropped before unigram/bigram extraction so the JD keyword list reflects real,
 * role-bearing terms rather than connective tissue.
 *
 * Deliberate inclusions / exclusions (documented per PDR):
 *   - "responsible", "work", "working", "various", "etc" are résumé filler → dropped.
 *   - "team" is KEPT (not a stopword): on a JD it is frequently a real, scored keyword
 *     ("team lead", "team management"). Same for "data", "system" — domain-bearing.
 *
 * Frozen so no consumer can mutate the shared set (determinism contract, PDR §11.5).
 */
export const STOPWORDS = Object.freeze(
  new Set([
    // articles / determiners
    'a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every', 'any',
    'all', 'some', 'no', 'such', 'both', 'either', 'neither', 'much', 'many',
    // pronouns
    'i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours', 'ourselves',
    'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'she', 'her', 'hers',
    'it', 'its', 'they', 'them', 'their', 'theirs', 'who', 'whom', 'whose',
    'which', 'what', 'whatever', 'whoever',
    // conjunctions / connectives
    'and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'although', 'though',
    'while', 'whereas', 'however', 'therefore', 'thus', 'hence', 'moreover',
    'furthermore', 'also', 'as', 'than', 'then', 'when', 'where', 'why', 'how',
    // prepositions
    'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
    'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'within', 'without', 'upon', 'per', 'via', 'across', 'among', 'around',
    // be / have / do / modal verbs
    'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has',
    'had', 'having', 'do', 'does', 'did', 'doing', 'done', 'will', 'would',
    'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'ought',
    // quantifiers / adverbs of degree
    'very', 'too', 'more', 'most', 'less', 'least', 'only', 'just', 'even',
    'still', 'almost', 'quite', 'rather', 'somewhat', 'enough', 'well',
    // misc function words
    'not', 'if', 'else', 'whether', 'there', 'here', 'now', 'ever', 'never',
    'always', 'often', 'sometimes', 'once', 'twice',
    // résumé / job-posting boilerplate
    // INVARIANT: no entry here may collide with a transmuter.js TORQUE_MAP key. A term
    // that is both a stopword and a torque key can never surface as a JD keyword, so it
    // can never be detected as a torque conflict, so the transmuter will rewrite it
    // unprotected — silently widening the very gap this engine measures. "used" was
    // such a collision (TORQUE_MAP "used" -> "Leveraged") and is deliberately omitted.
    'responsible', 'responsibilities', 'duties', 'including', 'include',
    'includes', 'etc', 'various', 'multiple', 'using', 'use',
    'ability', 'able', 'role', 'position', 'job', 'candidate', 'applicant',
    'experience', 'experienced', 'years', 'year', 'plus', 'preferred',
    'required', 'requirement', 'requirements', 'qualifications', 'must',
    'looking', 'seeking', 'join', 'help', 'helping', 'ensure', 'ensuring',
    'provide', 'providing', 'work', 'working', 'works', 'company', 'organization',
  ]),
);
