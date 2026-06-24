import sys
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                               QHBoxLayout, QTextEdit, QLineEdit, QPushButton, QLabel)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QFont, QShortcut, QKeySequence

from nlp_chatbot.client.core import ChatbotEngine, ChatbotConfig

class WorkerThread(QThread):
    response_ready = Signal(str, str) # status, message
    
    def __init__(self, engine, message):
        super().__init__()
        self.engine = engine
        self.message = message
        
    def run(self):
        try:
            response = self.engine.respond(self.message)
            if response.startswith("Error:"):
                self.response_ready.emit("error", response)
            elif self.message.lower() == "clear":
                self.response_ready.emit("system", response)
            else:
                self.response_ready.emit("bot", response)
        except Exception as e:
            self.response_ready.emit("error", f"Internal GUI Error: {str(e)}")

class ChatbotGUI(QMainWindow):
    def __init__(self, engine: ChatbotEngine):
        super().__init__()
        self.engine = engine
        self.setWindowTitle("Python Chatbot")
        self.resize(650, 750)
        self.setStyleSheet("background-color: #212121; color: #e0e0e0;")
        
        self.create_widgets()
        
        # Shortcuts
        QShortcut(QKeySequence("Ctrl+Q"), self, self.close)
        
        # Initial Greeting
        self.append_message("System", "Ready to consult the Oracle. Type 'clear' to reset.", "system")
        
    def create_widgets(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(15, 15, 15, 15)
        
        # Chat display area
        self.chat_display = QTextEdit()
        self.chat_display.setReadOnly(True)
        self.chat_display.setStyleSheet("""
            QTextEdit {
                background-color: #2d2d2d;
                border: none;
                border-radius: 5px;
                padding: 10px;
                font-family: Helvetica;
                font-size: 14px;
            }
        """)
        main_layout.addWidget(self.chat_display, stretch=1)
        
        # Input Area Layout
        input_layout = QHBoxLayout()
        input_layout.setContentsMargins(0, 10, 0, 0)
        
        self.input_field = QTextEdit()
        self.input_field.setFixedHeight(70)
        self.input_field.setStyleSheet("""
            QTextEdit {
                background-color: #424242;
                border: 1px solid #555555;
                border-radius: 4px;
                padding: 8px;
                font-family: Helvetica;
                font-size: 14px;
            }
        """)
        self.input_field.setPlaceholderText("Type your message here... (Enter to send, Shift+Enter for newline)")
        # Filter enter key
        self.input_field.installEventFilter(self)
        input_layout.addWidget(self.input_field, stretch=1)
        
        self.send_btn = QPushButton("Send")
        self.send_btn.setFixedSize(80, 70)
        self.send_btn.setFont(QFont("Helvetica", 11, QFont.Bold))
        self.send_btn.setStyleSheet("""
            QPushButton {
                background-color: #1976d2;
                color: white;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: #1565c0;
            }
            QPushButton:disabled {
                background-color: #555555;
                color: #888888;
            }
        """)
        self.send_btn.clicked.connect(self.send_message)
        input_layout.addWidget(self.send_btn)
        
        main_layout.addLayout(input_layout)
        
        # Status Bar
        self.status_bar = QLabel("Ready")
        self.status_bar.setStyleSheet("color: #9e9e9e; font-size: 12px; margin-top: 5px;")
        main_layout.addWidget(self.status_bar)
        
    def eventFilter(self, obj, event):
        from PySide6.QtCore import QEvent
        if obj == self.input_field and event.type() == QEvent.Type.KeyPress:
            if event.key() == Qt.Key_Return or event.key() == Qt.Key_Enter:
                if event.modifiers() == Qt.ShiftModifier:
                    return False # Allow newline
                else:
                    self.send_message()
                    return True # Consume Enter
        return super().eventFilter(obj, event)
        
    def append_message(self, sender, text, tag):
        colors = {
            "user": "#64b5f6",
            "bot": "#81c784",
            "system": "#ffb74d",
            "error": "#e57373"
        }
        color = colors.get(tag, "#ffffff")
        
        html = f'<b style="color:{color}; font-size:15px;">{sender}:</b><br><span style="font-size:14px; line-height:1.5;">{text}</span><br><br>'
        self.chat_display.append(html)
        
        # Scroll to bottom
        scrollbar = self.chat_display.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def send_message(self):
        msg = self.input_field.toPlainText().strip()
        if not msg:
            return
            
        self.append_message("You", msg, "user")
        self.input_field.clear()
        
        self.send_btn.setEnabled(False)
        self.status_bar.setText("Generating response...")
        
        # Threading to prevent GUI freeze
        self.worker = WorkerThread(self.engine, msg)
        self.worker.response_ready.connect(self.handle_response)
        self.worker.start()
        
    def handle_response(self, status, response):
        if status == "error":
            self.append_message("System Error", response, "error")
        elif status == "system":
            self.append_message("System", response, "system")
        else:
            self.append_message("Oracle", response, "bot")
            
        self.send_btn.setEnabled(True)
        self.status_bar.setText("Ready")
        self.input_field.setFocus()

def main():
    app = QApplication(sys.argv)
    config = ChatbotConfig()
    engine = ChatbotEngine(config)
    gui = ChatbotGUI(engine)
    gui.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
