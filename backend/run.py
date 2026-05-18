import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Render ပေါ်မှာ Port နံပါတ်ကို အော်တိုဖတ်ခိုင်းပြီး Host ကို 0.0.0.0 ပြောင်းပေးခြင်း
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
