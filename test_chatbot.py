from nlp_chatbot.model.chatbot import ChatbotModel
import sys
try:
    bot = ChatbotModel()
    print(bot.generate_response(["Hello"]))
except Exception as e:
    import traceback
    traceback.print_exc()
