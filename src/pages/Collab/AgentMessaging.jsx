/**
 * AgentMessaging - ritual channel for inter-agent communication
 * World-law connection: Agents are minds in the scholomance chamber.
 * Messages are "thought-threads" - glyph-tagged, persisted to the deterministic ledger
 * via /collab/messages (Migration v14, collab_messages table), and broadcast across
 * present minds. Each thought is etched into the chamber's memory and retrievable
 * by future incantations. Server-driven realtime across all clients rides SSE;
 * cross-tab echo within the same browser rides BroadcastChannel;
 * persistence rides the Cognitive Bus.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GLYPHS = ['✦', '◈', '⬡', '◎', '⟐', '⧫', '✧', '◉'];
const MAX_MESSAGES = 50;

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessageText(text) {
    const parts = text.split(/(PB-EXP-v1-[A-Z0-9-]+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('PB-EXP-v1')) {
            // Clicking dispatches an inspect event; the bytecode's corroboration
            // data is resolved by the listener from the ledger, not fabricated here.
            return (
                <button
                    key={i}
                    className="experience-rune"
                    onClick={() => {
                        const event = new CustomEvent('collab:inspect-experience', { detail: { bytecode: part } });
                        window.dispatchEvent(event);
                    }}
                    title="Click to consume Experience Bytecode"
                >
                    <span className="experience-rune__glyph">✦</span>
                    <span className="experience-rune__hash">{part.slice(0, 15)}...</span>
                </button>
            );
        }
        return part;
    });
}

/**
 * BroadcastChannel-based messaging for same-tab cross-component communication.
 * Messages are ephemeral - they live only in the current browser session.
 */
const CHANNEL_NAME = 'scholomance.collab.messaging';

let _channel = null;
function getChannel() {
    if (!_channel && typeof BroadcastChannel !== 'undefined') {
        _channel = new BroadcastChannel(CHANNEL_NAME);
    }
    return _channel;
}

export default function AgentMessaging({ agents, currentAgentId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [selectedGlyph, setSelectedGlyph] = useState(GLYPHS[0]);
    const [targetAgent, setTargetAgent] = useState('all'); // 'all' or specific agent ID
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);
    const fallbackMessageCounterRef = useRef(0);
    const didInitialScrollRef = useRef(false);

    // Fetch initial messages and set up SSE for realtime sync
    useEffect(() => {
        let isMounted = true;

        const fetchMessages = async () => {
            try {
                const response = await fetch('/collab/messages?limit=50');
                if (response.ok && isMounted) {
                    const data = await response.json();
                    setMessages(data.reverse());
                }
            } catch (err) {
                console.error('Failed to fetch thought-threads:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchMessages();

        // Realtime Sync via SSE
        const eventSource = new EventSource('/collab/messages/stream');
        
        eventSource.onmessage = (event) => {
            try {
                const newMessage = JSON.parse(event.data);
                if (isMounted) {
                    setMessages(prev => {
                        // Prevent duplicates (e.g. if we just sent it and it broadcast back)
                        if (prev.find(m => m.id === newMessage.id)) return prev;
                        const next = [...prev, newMessage];
                        return next.slice(-MAX_MESSAGES);
                    });
                }
            } catch (err) {
                console.error('SSE parse error:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection failed:', err);
        };

        return () => {
            isMounted = false;
            eventSource.close();
        };
    }, []);

    // Auto-scroll behavior:
    //  - First time content hydrates, jump straight to the bottom (no animation).
    //  - After that, only follow new messages if the user is already near the
    //    bottom, so we don't yank them away from history they scrolled up to read.
    useEffect(() => {
        const anchor = messagesEndRef.current;
        if (!anchor) return;
        const container = anchor.parentElement;

        if (!didInitialScrollRef.current) {
            if (messages.length > 0) {
                anchor.scrollIntoView({ behavior: 'auto' });
                didInitialScrollRef.current = true;
            }
            return;
        }

        const nearBottom = !container ||
            container.scrollHeight - container.scrollTop - container.clientHeight < 120;
        if (nearBottom) {
            anchor.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Listen for messages from BroadcastChannel (cross-tab)
    useEffect(() => {
        const channel = getChannel();
        if (!channel) return;

        channelRef.current = channel;

        const handler = (event) => {
            const msg = event.data;
            if (msg?.type === 'collab_message') {
                setMessages(prev => {
                    // Check for duplicates if already arrived via API
                    if (prev.some(m => m.id === msg.id)) return prev;
                    const next = [...prev, msg];
                    return next.slice(-MAX_MESSAGES);
                });
            }
        };

        channel.addEventListener('message', handler);
        return () => {
            channel.removeEventListener('message', handler);
        };
    }, []);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text) return;

        const senderId = currentAgentId || 'anonymous';
        const senderName = agents.find(a => a.id === currentAgentId)?.name || 'Unknown Mind';
        const targetName = targetAgent === 'all' ? 'All Minds' : (agents.find(a => a.id === targetAgent)?.name || 'Unknown Mind');

        // Extract bytecode if present for deterministic execution
        const bytecodeMatch = text.match(/PB-EXP-v1-[A-Z0-9-]+/);
        const bytecode = bytecodeMatch ? bytecodeMatch[0] : null;

        try {
            // POST to backend for persistence. Auth rides the same-origin session
            // cookie (sent automatically); collab routes are not CSRF-gated.
            const response = await fetch('/collab/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender_id: senderId,
                    target_id: targetAgent,
                    glyph: selectedGlyph,
                    text,
                    bytecode,
                }),
            });

            if (!response.ok) throw new Error('Transmission failed');
            const savedMsg = await response.json();

            // Normalized message for local state and broadcast
            const message = {
                ...savedMsg,
                type: 'collab_message',
                senderName,
                targetName,
                timestamp: savedMsg.created_at || new Date().toISOString(),
            };

            // Broadcast to all tabs
            const channel = getChannel();
            if (channel) {
                channel.postMessage(message);
            }

            // Also add to local state. Guard against the SSE echo of our own
            // message arriving before this resolves - it shares the same id.
            setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                const next = [...prev, message];
                return next.slice(-MAX_MESSAGES);
            });

            setInput('');
        } catch (err) {
            console.error('Thought-thread transmission failed:', err);
            fallbackMessageCounterRef.current += 1;
            // Fallback to local-only if backend is cold
            const message = {
                type: 'collab_message',
                id: `msg-${Date.now()}-${fallbackMessageCounterRef.current}`,
                senderId,
                senderName,
                targetId: targetAgent,
                targetName,
                glyph: selectedGlyph,
                text,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, message].slice(-MAX_MESSAGES));
            setInput('');
        }
    }, [input, selectedGlyph, targetAgent, currentAgentId, agents]);


    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    const connectedAgents = agents.filter(a => a.status !== 'offline');

    return (
        <div className="messaging-view">
            <div className="messaging-header">
                <h3 className="messaging-title">
                    <span className="messaging-title__glyph">⟐</span>
                    RITUAL CHANNEL
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="messaging-subtitle">
                        {connectedAgents.length} minds present - thoughts etched into the chamber&apos;s ledger
                    </span>
                    {currentAgentId && (
                        <span style={{ fontSize: '9px', color: 'var(--color-collab-gold)', fontFamily: 'var(--font-collab-mono)', textTransform: 'uppercase' }}>
                            ACTIVE MIND: {agents.find(a => a.id === currentAgentId)?.name || currentAgentId}
                        </span>
                    )}
                </div>
            </div>

            {/* Message stream */}
            <div className="messaging-stream" role="log" aria-live="polite" aria-label="Agent messages">
                <AnimatePresence initial={false}>
                    {isLoading ? (
                        <motion.div
                            className="messaging-empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <span className="messaging-empty__glyph">⟐</span>
                            <p className="messaging-empty-text">Summoning thought-threads from the ledger...</p>
                        </motion.div>
                    ) : messages.length === 0 ? (
                        <motion.div
                            className="messaging-empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <span className="messaging-empty__glyph">◈</span>
                            <p className="messaging-empty-text">The chamber is silent. Send a thought to begin.</p>
                        </motion.div>
                    ) : (
                        messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                className={`messaging-entry ${msg.senderId === currentAgentId ? 'messaging-entry--self' : ''}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="messaging-entry__glyph" style={{ color: 'var(--color-collab-accent)' }}>
                                    {msg.glyph}
                                </span>
                                <div className="messaging-entry__body">
                                    <div className="messaging-entry__meta">
                                        <span className="messaging-entry__sender">{msg.senderName}</span>
                                        <span className="messaging-entry__arrow">→</span>
                                        <span className="messaging-entry__target">{msg.targetName}</span>
                                        <span className="messaging-entry__time">{formatTime(new Date(msg.timestamp))}</span>
                                    </div>
                                    <p className="messaging-entry__text">{renderMessageText(msg.text)}</p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="messaging-input">
                <div className="messaging-input__controls">
                    {/* Glyph selector */}
                    <div className="glyph-selector" role="radiogroup" aria-label="Message glyph">
                        {GLYPHS.map(g => (
                            <button
                                key={g}
                                className={`glyph-option ${selectedGlyph === g ? 'glyph-option--active' : ''}`}
                                onClick={() => setSelectedGlyph(g)}
                                role="radio"
                                aria-checked={selectedGlyph === g}
                                aria-label={`Glyph ${g}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>

                    {/* Target agent selector */}
                    <select
                        className="messaging-input__target"
                        value={targetAgent}
                        onChange={(e) => setTargetAgent(e.target.value)}
                        aria-label="Target agent"
                    >
                        <option value="all">All Minds</option>
                        {connectedAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                    </select>
                </div>

                <textarea
                    className="messaging-input__textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a thought to the chamber..."
                    rows={2}
                    aria-label="Message input"
                />

                <button
                    className="messaging-input__send"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    aria-label="Send message"
                >
                    {selectedGlyph} SEND
                </button>
            </div>
        </div>
    );
}
