import sqlite3
import os
import re

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'oracle_memory.sqlite')

TEXTS = [
    # Ernest Hemingway
    "There is nothing noble in being superior to your fellow man; true nobility is being superior to your former self.",
    "The world breaks every one and afterward many are strong at the broken places.",
    "Courage is grace under pressure.",
    "Always do sober what you said you'd do drunk. That will teach you to keep your mouth shut.",
    "Every man's life ends the same way. It is only the details of how he lived and how he died that distinguish one man from another.",
    
    # Robert Frost
    "In three words I can sum up everything I've learned about life: it goes on.",
    "Two roads diverged in a wood, and I—I took the one less traveled by, And that has made all the difference.",
    "The best way out is always through.",
    "Poetry is when an emotion has found its thought and the thought has found words.",
    "Half the world is composed of people who have something to say and can't, and the other half who have nothing to say and keep on saying it.",
    
    # Edgar Allan Poe
    "All that we see or seem is but a dream within a dream.",
    "Words have no power to impress the mind without the exquisite horror of their reality.",
    "I became insane, with long intervals of horrible sanity.",
    "Believe nothing you hear, and only one half that you see.",
    "Those who dream by day are cognizant of many things which escape those who dream only by night.",
    
    # Mark Twain
    "The secret of getting ahead is getting started.",
    "Whenever you find yourself on the side of the majority, it is time to pause and reflect.",
    "Kindness is the language which the deaf can hear and the blind can see.",
    "Truth is stranger than fiction, but it is because Fiction is obliged to stick to possibilities; Truth isn't.",
    "Anger is an acid that can do more harm to the vessel in which it is stored than to anything on which it is poured.",
]

def train_markov():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS memory_cells (
            w1 TEXT,
            w2 TEXT,
            w3 TEXT,
            weight INTEGER,
            PRIMARY KEY (w1, w2, w3)
        )
    ''')
    
    for text in TEXTS:
        # Tokenize and keep basic punctuation attached, but we want lowercase for w1, w2
        words = re.findall(r'\b\w+\b', text.lower())
        if len(words) < 2:
            continue
            
        w1 = '__START1__'
        w2 = '__START2__'
        
        for w3 in words:
            cursor.execute('''
                INSERT INTO memory_cells (w1, w2, w3, weight) 
                VALUES (?, ?, ?, 1)
                ON CONFLICT(w1, w2, w3) DO UPDATE SET weight = weight + 1
            ''', (w1, w2, w3))
            w1, w2 = w2, w3
            
        # Add END token
        cursor.execute('''
            INSERT INTO memory_cells (w1, w2, w3, weight) 
            VALUES (?, ?, '__END__', 1)
            ON CONFLICT(w1, w2, w3) DO UPDATE SET weight = weight + 1
        ''', (w1, w2))

    conn.commit()
    conn.close()
    print("Oracle memory trained with refined literary knowledge!")

if __name__ == "__main__":
    train_markov()
