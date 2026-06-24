import pytest
from data.preprocess import clean_message
from safety.filters import filter_unsafe, hallucination_guard
from memory.session import SessionMemory

def test_clean_message():
    assert clean_message("  hello   ") == "hello"

def test_safety_filter():
    assert filter_unsafe("hello world") == True
    assert filter_unsafe("this is a toxic message") == False

def test_hallucination_guard():
    resp = hallucination_guard("What is the capital of France?", "Paris.")
    assert "I am an AI" in resp

def test_session_memory():
    mem = SessionMemory(max_turns=2)
    mem.add_message("123", "user1")
    mem.add_message("123", "bot1")
    mem.add_message("123", "user2")
    mem.add_message("123", "bot2")
    mem.add_message("123", "user3")
    
    # max_turns=2 means 4 messages. 
    # Current list before cutoff: user1, bot1, user2, bot2, user3 (length 5)
    # Cutoff to 4: bot1, user2, bot2, user3
    history = mem.get_history("123")
    assert len(history) == 4
    assert history == ["bot1", "user2", "bot2", "user3"]
    
    mem.clear_session("123")
    assert len(mem.get_history("123")) == 0
