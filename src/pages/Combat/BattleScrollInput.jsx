import React, { useState } from 'react';

export default function BattleScrollInput({ onSubmit, isDisabled, scoreLive }) {
  const [text, setText] = useState('');
  const [liveRating, setLiveRating] = useState({ totalScore: 0, rating: 'NEOPHYTE' });

  const handleChange = async (e) => {
    const val = e.target.value;
    setText(val);
    if (scoreLive) {
      const rating = await scoreLive(val);
      setLiveRating(rating);
    }
  };

  const handleSubmit = () => {
    if (text.trim() && !isDisabled) {
      onSubmit(text);
      setText('');
      setLiveRating({ totalScore: 0, rating: 'NEOPHYTE' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="battle-scroll-input-wrapper">
      <div className="scroll-label">CAST YOUR VERSE</div>
      <div className="scroll-textarea-container">
        <textarea
          className="battle-scroll-textarea"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder="Shift+Enter to unleash..."
          aria-label="Write your scroll verse"
        />
        <div className="live-meter">
          <div 
            className="meter-fill" 
            data-rating={liveRating.rating}
            style={{ width: `${liveRating.totalScore}%` }}
          />
        </div>
        <div className="rating-label" data-rating={liveRating.rating}>
          {liveRating.rating}
        </div>
      </div>
      <div className="submit-bar">
        <div className="word-count">{text.trim().split(/\s+/).filter(Boolean).length} WORDS</div>
        <button 
          className="submit-button" 
          onClick={handleSubmit}
          disabled={isDisabled || !text.trim()}
        >
          UNLEASH
        </button>
      </div>
    </div>
  );
}
