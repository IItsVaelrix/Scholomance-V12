import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './ArchiveOfDominance.css';

/**
 * Archive of Dominance (Project Kyōka Suigetsu)
 * Dual-Pane Grimoire for Codebase Exploration
 */
export default function ArchiveOfDominance({ onExit }) {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [neighbors, setNeighbors] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('default'); // 'default', 'constellation', 'deep'

    // Fetch all indexed files on mount
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const res = await fetch('/collab/codebase/files');
                const data = await res.json();
                setFiles(data);
            } catch (err) {
                console.error('Failed to fetch codebase files:', err);
            }
        };
        fetchFiles();
    }, []);

    // Fetch neighbors when a file is selected
    useEffect(() => {
        if (!selectedFile) {
            setNeighbors(null);
            return;
        }

        const fetchNeighbors = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/collab/codebase/neighbors?path=${encodeURIComponent(selectedFile)}`);
                const data = await res.json();
                setNeighbors(data);
            } catch (err) {
                console.error('Failed to fetch file neighbors:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchNeighbors();
    }, [selectedFile]);

    // Hybrid Search handler
    const handleSearch = useCallback(async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/collab/codebase/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error('Hybrid search failed:', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    return (
        <div className="archive-dominance">
            {/* Header / Search */}
            <header className="archive-header">
                <div className="archive-title-area">
                    <h2 className="archive-title">ARCHIVE OF DOMINANCE</h2>
                    <span className="archive-subtitle">Project Kyōka Suigetsu // Sector 12</span>
                </div>
                
                <form className="archive-search" onSubmit={handleSearch}>
                    <input
                        type="text"
                        className="archive-search__input"
                        placeholder="HYBRID SEARCH (Literal, Semantic, Phonetic)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="archive-search__submit">DISCERN</button>
                </form>

                <button type="button" className="archive-exit" onClick={onExit}>EXIT REALITY</button>
            </header>

            <div className="archive-body">
                {/* Left Pane: Physical Reality (Files) */}
                <aside className="archive-pane archive-pane--left">
                    <div className="pane-header">PHYSICAL REALITY (FILESYSTEM)</div>
                    <div className="file-scrolls">
                        {files.map(path => (
                            <button
                                type="button"
                                key={path}
                                className={`file-scroll ${selectedFile === path ? 'active' : ''}`}
                                onClick={() => setSelectedFile(path)}
                            >
                                <span className="file-scroll__icon">📜</span>
                                <span className="file-scroll__path">{path}</span>
                            </button>
                        ))}
                        {files.length === 0 && <div className="pane-empty">No indexed files found.</div>}
                    </div>
                </aside>

                {/* Right Pane: Astral Reality (Vector Space) */}
                <main className="archive-pane archive-pane--right">
                    <div className="pane-header">
                        <span>ASTRAL REALITY (VECTOR SPACE)</span>
                        <div className="view-modes">
                            <button
                                type="button"
                                className={`view-mode-btn ${viewMode === 'default' ? 'active' : ''}`}
                                onClick={() => setViewMode('default')}
                            >
                                CARDS
                            </button>
                            <button
                                type="button"
                                className={`view-mode-btn ${viewMode === 'constellation' ? 'active' : ''}`}
                                onClick={() => setViewMode('constellation')}
                            >
                                SPECTACLE
                            </button>
                        </div>
                    </div>

                    <div className="astral-content">
                        {loading && <div className="astral-loading">MANIFESTING...</div>}
                        
                        {!loading && viewMode === 'constellation' && (
                            <ConstellationView 
                                data={searchResults || neighbors} 
                                mode={searchResults ? 'search' : 'neighbors'}
                            />
                        )}

                        {!loading && viewMode === 'default' && searchResults && (
                            <div className="search-results">
                                <section className="result-section">
                                    <h4 className="section-title">LITERAL MATCHES</h4>
                                    {searchResults.literal.map((r, i) => (
                                        <div key={i} className="result-card result-card--literal">
                                            <div className="result-card__path">{r.file_path}:{r.line_number}</div>
                                            <div className="result-card__preview">{r.preview}</div>
                                        </div>
                                    ))}
                                </section>

                                <section className="result-section">
                                    <h4 className="section-title">SEMANTIC MATCHES</h4>
                                    {searchResults.semantic.map((r, i) => (
                                        <div key={i} className="result-card result-card--semantic">
                                            <div className="result-card__path">{r.file_path}</div>
                                            <div className="result-card__score">Similarity: {(r.score * 100).toFixed(1)}%</div>
                                            <div className="result-card__preview">{r.preview}</div>
                                        </div>
                                    ))}
                                </section>

                                <section className="result-section">
                                    <h4 className="section-title">PHONETIC MATCHES</h4>
                                    {searchResults.phonetic.map((r, i) => (
                                        <div key={i} className="result-card result-card--phonetic">
                                            <div className="result-card__path">{r.file_path}</div>
                                            <div className="result-card__score">Phonetic Link: {(r.score * 100).toFixed(1)}%</div>
                                        </div>
                                    ))}
                                </section>

                                <section className="result-section">
                                    <h4 className="section-title">LINKED DOCS</h4>
                                    {searchResults.linkedDocs.map((r, i) => (
                                        <div key={i} className="result-card result-card--docs">
                                            <div className="result-card__title">{r.title}</div>
                                            <div className="result-card__path">{r.file_path}</div>
                                            <div className="result-card__preview">{r.preview}</div>
                                        </div>
                                    ))}
                                </section>
                            </div>
                        )}

                        {!loading && !searchResults && neighbors && (
                            <div className="neighbor-view">
                                <h3 className="context-focus">FOCUS: {selectedFile.split('/').pop()}</h3>
                                
                                <section className="result-section">
                                    <h4 className="section-title">SEMANTIC NEIGHBORS</h4>
                                    {neighbors.semantic.map((r, i) => (
                                        <div key={i} className="result-card result-card--semantic">
                                            <div className="result-card__path">{r.file_path}</div>
                                            <div className="result-card__score">Similarity: {(r.score * 100).toFixed(1)}%</div>
                                            <div className="result-card__preview">{r.preview}</div>
                                        </div>
                                    ))}
                                </section>

                                <section className="result-section">
                                    <h4 className="section-title">PHONETIC ECHOES</h4>
                                    {neighbors.phonetic.map((r, i) => (
                                        <div key={i} className="result-card result-card--phonetic">
                                            <div className="result-card__path">{r.file_path}</div>
                                            <div className="result-card__score">Phonetic Resonance: {(r.score * 100).toFixed(1)}%</div>
                                        </div>
                                    ))}
                                </section>

                                <section className="result-section">
                                    <h4 className="section-title">LINKED CONTRACTS</h4>
                                    {neighbors.linkedDocs.map((r, i) => (
                                        <div key={i} className="result-card result-card--docs">
                                            <div className="result-card__title">{r.title}</div>
                                            <div className="result-card__path">{r.file_path}</div>
                                            <div className="result-card__preview">{r.preview}</div>
                                        </div>
                                    ))}
                                </section>
                            </div>
                        )}

                        {!loading && !searchResults && !neighbors && (
                            <div className="astral-empty">
                                <div className="oracle-icon">👁️</div>
                                <h3>SELECT A SCROLL OR DISCERN INTENT</h3>
                                <p>The vector space awaits your command.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

function ConstellationView({ data, mode }) {
    const semantic = Array.isArray(data?.semantic) ? data.semantic : [];
    const phonetic = Array.isArray(data?.phonetic) ? data.phonetic : [];
    const items = [
        ...semantic.map(item => ({ ...item, isPhonetic: false })),
        ...phonetic.map(item => ({ ...item, isPhonetic: true })),
    ];

    if (items.length === 0) {
        return (
            <div className="constellation-view constellation-view--empty">
                <div className="constellation-center">
                    <div className="center-core"></div>
                </div>
                <div className="constellation-legend">
                    <span className="legend-item">{mode === 'search' ? 'NO MATCHES' : 'NO NEIGHBORS'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="constellation-view">
            <div className="constellation-grid">
                {items.map((item, i) => {
                    const angle = (i / items.length) * Math.PI * 2;
                    const radius = 200 + ((i % 5) * 10);
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <motion.div
                            key={`${item.file_path || 'node'}-${i}`}
                            className={`constellation-node ${item.isPhonetic ? 'phonetic' : 'semantic'}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, x, y }}
                            transition={{ delay: i * 0.05, type: 'spring' }}
                            whileHover={{ scale: 1.2 }}
                        >
                            <div className="node-label">{String(item.file_path || 'unknown').split('/').pop()}</div>
                            <div className="node-core"></div>
                            <div className="node-glow"></div>
                        </motion.div>
                    );
                })}
                <div className="constellation-center">
                    <div className="center-core"></div>
                    <div className="center-rings">
                        <div className="ring"></div>
                        <div className="ring"></div>
                    </div>
                </div>
            </div>
            <div className="constellation-legend">
                <span className="legend-item"><span className="dot dot--semantic"></span> SEMANTIC</span>
                <span className="legend-item"><span className="dot dot--phonetic"></span> PHONETIC</span>
            </div>
        </div>
    );
}
