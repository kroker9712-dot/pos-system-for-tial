import os
import subprocess
from dotenv import load_dotenv
from app import create_app, db

load_dotenv()
app = create_app()

if __name__ == "__main__":
    # ဆာဗာ စပွင့်တာနဲ့ Database Table တွေ ဆောက်မယ်
    with app.app_context():
        try:
            db.create_all()
            print("Database tables checked/created.")
        except Exception as e:
            print(f"Database sync error: {e}")

    # ဆာဗာမပွင့်ခင် seed.py ဖိုင်တစ်ခုလုံးကို အလိုအလျောက် အနောက်ကနေ လှမ်း Run ခိုင်းခြင်း
    try:
        print("Running database seed...")
        # seed.py ဖိုင်ရှိတဲ့ လမ်းကြောင်းအတိုင်း လှမ်းပတ်ခိုင်းတာပါ
        if os.path.exists("seed.py"):
            subprocess.run(["python", "seed.py"], check=True)
        elif os.path.exists("app/seed.py"):
            subprocess.run(["python", "app/seed.py"], check=True)
        print("Seed process completed!")
    except Exception as e:
        print(f"Seed process skipped or error: {e}")

    # Render Port & Host Setting
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
