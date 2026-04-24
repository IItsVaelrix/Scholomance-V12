/**
 * AgentRegisterWizard — Multi-step wizard for registering new agents
 *
 * Steps:
 * 1. role      — Pick a role (large cards, auto-advances)
 * 2. identity  — Agent ID + Display Name
 * 3. caps      — Tag-chip capability input (optional)
 * 4. confirm   — Summary → "Summon Agent"
 * 5. summoning — Thematic loading
 * 6. success   — Sigil pulse, auto-close
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';

import './AgentRegisterWizard.css';

const ROLE_OPTIONS = [
    {
        value: 'ui',
        label: 'UI / Visual',
        description: 'Frontend, CSS, JSX, accessibility',
        flavor: 'Weaves the visible surface of the world',
        glyph: '◈',
    },
    {
        value: 'backend',
        label: 'Backend / Logic',
        description: 'Engine, schemas, runtime',
        flavor: 'Forges the laws that govern the syntax realm',
        glyph: '⬡',
    },
    {
        value: 'qa',
        label: 'Testing / QA',
        description: 'Tests, CI, debugging',
        flavor: 'Keeper of contracts — breaks what must not pass',
        glyph: '◉',
    },
];

const STEP_LABELS = ['Role', 'Identity', 'Framework', 'Capabilities', 'Confirm'];

function StepProgress({ current }) {
    return (
        <div className="arw-progress" role="list" aria-label="Wizard steps">
            {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === current;
                const isDone = stepNum < current;
                return (
                    <div
                        key={label}
                        className={`arw-progress__step ${isActive ? 'arw-progress__step--active' : ''} ${isDone ? 'arw-progress__step--done' : ''}`}
                        role="listitem"
                        aria-current={isActive ? 'step' : undefined}
                    >
                        <span className="arw-progress__glyph">{isDone ? '◆' : isActive ? '◆' : '◇'}</span>
                        <span className="arw-progress__label">{label}</span>
                    </div>
                );
            })}
        </div>
    );
}

const FRAMEWORK_OPTIONS = [
    { value: 'native', label: 'Native Mind', icon: '◈', desc: 'Direct project execution' },
    { value: 'langchain', label: 'LangChain', icon: '🦜', desc: 'Chain-of-thought orchestration' },
    { value: 'autogen', label: 'AutoGen', icon: '🤖', desc: 'Multi-agent conversation' },
    { value: 'mcp-external', label: 'External MCP', icon: '🌐', desc: 'Remote tool-use binding' },
];

function FrameworkStep({ framework, onSelect }) {
    return (
        <div className="arw-step arw-step--framework">
            <p className="arw-step__hint">Specify the framework origin of this mind. This determines the handshake ritual used.</p>
            <div className="arw-framework-grid">
                {FRAMEWORK_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        className={`arw-framework-card ${framework === opt.value ? 'arw-framework-card--active' : ''}`}
                        onClick={() => onSelect(opt.value)}
                        aria-label={`Select framework: ${opt.label}`}
                    >
                        <span className="arw-framework-card__icon">{opt.icon}</span>
                        <span className="arw-framework-card__label">{opt.label}</span>
                        <span className="arw-framework-card__desc">{opt.desc}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function RoleStep({ onSelect }) {
    return (
        <div className="arw-step arw-step--role">
            <p className="arw-step__hint">Choose the school of this agent. Your selection shapes its place in the chamber.</p>
            <div className="arw-role-grid">
                {ROLE_OPTIONS.map((opt) => (
                    <motion.button
                        key={opt.value}
                        className="arw-role-card"
                        onClick={() => onSelect(opt.value)}
                        whileHover={{ y: -3, boxShadow: '0 0 20px rgba(197, 160, 89, 0.2)' }}
                        whileTap={{ scale: 0.98 }}
                        aria-label={`Select role: ${opt.label}`}
                    >
                        <span className="arw-role-card__glyph">{opt.glyph}</span>
                        <span className="arw-role-card__label">{opt.label}</span>
                        <span className="arw-role-card__desc">{opt.description}</span>
                        <span className="arw-role-card__flavor">{opt.flavor}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

function IdentityStep({ agentId, name, onAgentIdChange, onNameChange, error }) {
    const idRef = useRef(null);

    useEffect(() => {
        idRef.current?.focus();
    }, []);

    return (
        <div className="arw-step arw-step--identity">
            <p className="arw-step__hint">Name this agent. The ID is its sigil — permanent and unique.</p>

            <div className="arw-field">
                <label htmlFor="arw-agent-id" className="arw-field__label">
                    Agent ID
                </label>
                <input
                    id="arw-agent-id"
                    ref={idRef}
                    type="text"
                    className="arw-field__input arw-field__input--mono"
                    value={agentId}
                    onChange={(e) => onAgentIdChange(e.target.value)}
                    placeholder="e.g. claude-ui, qwen-backend"
                    autoComplete="off"
                    spellCheck={false}
                />
                <span className="arw-field__help">Lowercase slug — no spaces. Used to identify this agent instance.</span>
            </div>

            <div className="arw-field">
                <label htmlFor="arw-agent-name" className="arw-field__label">
                    Display Name
                </label>
                <input
                    id="arw-agent-name"
                    type="text"
                    className="arw-field__input"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="e.g. Claude UI, Qwen Backend"
                    autoComplete="off"
                />
            </div>

            {error && (
                <div className="arw-error" role="alert">{error}</div>
            )}
        </div>
    );
}

function CapabilitiesStep({ caps, onAdd, onRemove }) {
    const [inputVal, setInputVal] = useState('');

    const flush = useCallback(() => {
        const tokens = inputVal.split(',').map(s => s.trim()).filter(Boolean);
        tokens.forEach(t => {
            if (t && !caps.includes(t)) onAdd(t);
        });
        setInputVal('');
    }, [inputVal, caps, onAdd]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            flush();
        }
    }, [flush]);

    return (
        <div className="arw-step arw-step--caps">
            <p className="arw-step__hint">Declare this agent&apos;s capabilities. These help assign it the right tasks.</p>

            <div className="arw-field">
                <label htmlFor="arw-caps-input" className="arw-field__label">
                    Capabilities <span className="arw-field__optional">(optional)</span>
                </label>
                <div className="arw-caps-box">
                    {caps.map((cap) => (
                        <span key={cap} className="arw-cap-chip">
                            {cap}
                            <button
                                type="button"
                                className="arw-cap-chip__remove"
                                onClick={() => onRemove(cap)}
                                aria-label={`Remove capability ${cap}`}
                            >×</button>
                        </span>
                    ))}
                    <input
                        id="arw-caps-input"
                        type="text"
                        className="arw-caps-input"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={flush}
                        placeholder={caps.length === 0 ? 'jsx, css, node, fastify… press Enter' : ''}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
                <span className="arw-field__help">Press Enter or comma to add. Tab to continue.</span>
            </div>
        </div>
    );
}

function ConfirmStep({ role, agentId, name, framework, caps, error }) {
    const roleOpt = ROLE_OPTIONS.find(r => r.value === role);
    const frameworkOpt = FRAMEWORK_OPTIONS.find(f => f.value === framework);

    return (
        <div className="arw-step arw-step--confirm">
            <p className="arw-step__hint">Review the binding before the ritual is sealed.</p>

            <div className="arw-summary">
                <div className="arw-summary__row">
                    <span className="arw-summary__key">Role</span>
                    <span className="arw-summary__val">
                        <span className="arw-summary__glyph">{roleOpt?.glyph}</span>
                        {roleOpt?.label}
                    </span>
                </div>
                <div className="arw-summary__row">
                    <span className="arw-summary__key">Framework</span>
                    <span className="arw-summary__val">
                        <span className="arw-summary__glyph">{frameworkOpt?.icon}</span>
                        {frameworkOpt?.label}
                    </span>
                </div>
                <div className="arw-summary__row">
                    <span className="arw-summary__key">Agent ID</span>
                    <span className="arw-summary__val arw-summary__val--mono">{agentId}</span>
                </div>
                <div className="arw-summary__row">
                    <span className="arw-summary__key">Name</span>
                    <span className="arw-summary__val">{name}</span>
                </div>
                <div className="arw-summary__row">
                    <span className="arw-summary__key">Capabilities</span>
                    <span className="arw-summary__val">
                        {caps.length === 0
                            ? <span className="arw-summary__none">none declared</span>
                            : caps.map(c => <span key={c} className="arw-cap-chip arw-cap-chip--sm">{c}</span>)
                        }
                    </span>
                </div>
            </div>

            {error && (
                <div className="arw-error" role="alert">{error}</div>
            )}
        </div>
    );
}

function SummoningStep() {
    return (
        <div className="arw-step arw-step--summoning" aria-live="polite" aria-label="Registering agent">
            <div className="arw-summon-shimmer" />
            <p className="arw-summon-text">Binding agent to the ritual chamber...</p>
        </div>
    );
}

function SuccessStep({ name }) {
    return (
        <div className="arw-step arw-step--success" aria-live="polite">
            <motion.div
                className="arw-success-sigil"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                aria-hidden="true"
            >
                ✦
            </motion.div>
            <p className="arw-success-text">
                <strong>{name}</strong> bound.<br />
                The chamber acknowledges their presence.
            </p>
        </div>
    );
}

const INITIAL_DATA = {
    role: null,
    framework: 'native',
    agentId: '',
    name: '',
    caps: [],
};

export default function AgentRegisterWizard({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState('role'); // role | identity | framework | caps | confirm | summoning | success
    const [data, setData] = useState(INITIAL_DATA);
    const [identityError, setIdentityError] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('role');
            setData(INITIAL_DATA);
            setIdentityError(null);
            setSubmitError(null);
        }
    }, [isOpen]);

    const stepNumber = { role: 1, identity: 2, framework: 3, caps: 4, confirm: 5 }[step] ?? null;

    const handleRoleSelect = useCallback((role) => {
        setData(d => ({ ...d, role }));
        setStep('identity');
    }, []);

    const handleIdentityNext = useCallback(() => {
        if (!data.agentId.trim()) {
            setIdentityError('Agent ID is required.');
            return;
        }
        if (!data.name.trim()) {
            setIdentityError('Display name is required.');
            return;
        }
        setIdentityError(null);
        setStep('framework');
    }, [data.agentId, data.name]);

    const handleFrameworkSelect = useCallback((framework) => {
        setData(d => ({ ...d, framework }));
        setStep('caps');
    }, []);

    const handleAddCap = useCallback((cap) => {
        setData(d => ({ ...d, caps: [...d.caps, cap] }));
    }, []);

    const handleRemoveCap = useCallback((cap) => {
        setData(d => ({ ...d, caps: d.caps.filter(c => c !== cap) }));
    }, []);

    const handleSubmit = useCallback(async () => {
        setSubmitError(null);
        setStep('summoning');

        try {
            const res = await fetch('/collab/agents/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: data.agentId.trim(),
                    name: data.name.trim(),
                    role: data.role,
                    framework_origin: data.framework,
                    capabilities: data.caps,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || err.details?.join(', ') || 'Registration failed');
            }

            const agent = await res.json();

            await fetch(`/collab/agents/${data.agentId.trim()}/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'online', current_task_id: null }),
            });

            setStep('success');
            setTimeout(() => {
                onSuccess?.(agent);
                onClose();
            }, 1800);
        } catch (err) {
            setSubmitError(err.message || 'An unexpected error occurred');
            setStep('confirm');
        }
    }, [data, onSuccess, onClose]);

    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget && step !== 'summoning') {
            onClose();
        }
    }, [step, onClose]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && step !== 'summoning') {
            onClose();
        }
    }, [step, onClose]);

    const isTransient = step === 'summoning' || step === 'success';
    const showProgress = stepNumber !== null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="arw-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleBackdropClick}
                    onKeyDown={handleKeyDown}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="arw-title"
                    tabIndex={-1}
                >
                    <motion.div
                        className="arw-modal"
                        initial={{ scale: 0.95, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 24 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <header className="arw-header">
                            <h3 id="arw-title" className="arw-header__title">
                                REGISTER AGENT // SUMMON_RITUAL
                            </h3>
                            {!isTransient && (
                                <button
                                    className="arw-header__close"
                                    onClick={onClose}
                                    aria-label="Close wizard"
                                >
                                    ×
                                </button>
                            )}
                        </header>

                        {/* Progress */}
                        {showProgress && <StepProgress current={stepNumber} />}

                        {/* Body */}
                        <div className="arw-body">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {step === 'role' && (
                                        <RoleStep onSelect={handleRoleSelect} />
                                    )}
                                    {step === 'identity' && (
                                        <IdentityStep
                                            agentId={data.agentId}
                                            name={data.name}
                                            onAgentIdChange={(v) => setData(d => ({ ...d, agentId: v }))}
                                            onNameChange={(v) => setData(d => ({ ...d, name: v }))}
                                            error={identityError}
                                        />
                                    )}
                                    {step === 'framework' && (
                                        <FrameworkStep
                                            framework={data.framework}
                                            onSelect={handleFrameworkSelect}
                                        />
                                    )}
                                    {step === 'caps' && (
                                        <CapabilitiesStep
                                            caps={data.caps}
                                            onAdd={handleAddCap}
                                            onRemove={handleRemoveCap}
                                        />
                                    )}
                                    {step === 'confirm' && (
                                        <ConfirmStep
                                            role={data.role}
                                            agentId={data.agentId}
                                            name={data.name}
                                            framework={data.framework}
                                            caps={data.caps}
                                            error={submitError}
                                        />
                                    )}
                                    {step === 'summoning' && <SummoningStep />}
                                    {step === 'success' && <SuccessStep name={data.name} />}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer nav */}
                        {step === 'identity' && (
                            <footer className="arw-footer">
                                <button className="arw-btn arw-btn--ghost" onClick={() => setStep('role')}>Back</button>
                                <button className="arw-btn arw-btn--primary" onClick={handleIdentityNext}>Next</button>
                            </footer>
                        )}
                        {step === 'framework' && (
                            <footer className="arw-footer">
                                <button className="arw-btn arw-btn--ghost" onClick={() => setStep('identity')}>Back</button>
                            </footer>
                        )}
                        {step === 'caps' && (
                            <footer className="arw-footer">
                                <button className="arw-btn arw-btn--ghost" onClick={() => setStep('framework')}>Back</button>
                                <div className="arw-footer__right">
                                    {data.caps.length === 0 && (
                                        <button className="arw-btn arw-btn--ghost arw-btn--skip" onClick={() => setStep('confirm')}>Skip</button>
                                    )}
                                    <button className="arw-btn arw-btn--primary" onClick={() => setStep('confirm')}>Next</button>
                                </div>
                            </footer>
                        )}
                        {step === 'confirm' && (
                            <footer className="arw-footer">
                                <button className="arw-btn arw-btn--ghost" onClick={() => setStep('caps')}>Back</button>
                                <button className="arw-btn arw-btn--summon" onClick={handleSubmit}>
                                    Summon Agent
                                </button>
                            </footer>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

