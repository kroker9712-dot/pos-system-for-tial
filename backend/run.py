import os
from dotenv import load_dotenv
from app import create_app, db

# seed.py ထဲက seed_data ကို လှမ်းခေါ်ခြင်း
try:
    from seed import seed_data
except ImportError:
    # အကယ်၍ seed ဖိုင်က app folder ထဲမှာ ရှိနေခဲ့ရင်
    from app.seed import seed_data

load_dotenv()
app = create_app()

if __name__ == "__main__":
    # ဆာဗာ စပွင့်တာနဲ့ Database ထဲကို ဒေတာတွေ အော်တို သွားထည့်ခိုင်းခြင်း
    with app.app_context():
        try:
            db.create_all() # Table မရှိသေးရင် အော်တိုဆောက်မယ်
            seed_data()     # အကောင့်ဒေတာတွေ သွားထည့်မယ်
            print("Database seeded successfully via run.py!")
        except Exception as e:
            print(f"Seeding info/error: {e}")

    # Render ပေါ်မှာ Port နံပါတ်ကို အော်တိုဖတ်ခိုင်းပြီး Host ကို 0.0.0.0 ပြောင်းခြင်း
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
