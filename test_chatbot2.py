from nlp_chatbot.model.chatbot import ChatbotModel
import sys
try:
    bot = ChatbotModel()
    print("Model loaded successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
