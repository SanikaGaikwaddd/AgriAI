"""Farming assistant: uses Claude if ANTHROPIC_API_KEY is set, otherwise a built-in knowledge base."""
import os

SYSTEM_PROMPT = (
    "You are AgriCare Assistant, a practical farming helper for Indian farmers. "
    "Answer questions about crops, soil, irrigation, fertilizer, pests and plant diseases. "
    "Reply in the same language the user writes in (English, Hindi or Marathi). "
    "Keep answers short, clear and practical, using simple steps. "
    "For pesticide or chemical use, always say to follow the product label and local registration, "
    "and to confirm serious problems with a local agricultural officer (Krishi Vigyan Kendra). "
    "If you are unsure, say so. If asked something unrelated to farming, politely steer back to farming."
)

KNOWLEDGE_BASE = [
    (["early blight", "target", "brown spot", "concentric"],
     "Early blight (tomato/potato): brown spots with ring patterns, usually on older leaves first. "
     "Remove infected leaves, avoid overhead watering, rotate crops, keep plants spaced for airflow. "
     "If you use a fungicide, choose one registered locally and follow the label."),
    (["late blight", "phytophthora"],
     "Late blight spreads fast in cool, wet weather: dark water-soaked patches, white growth under leaves. "
     "Remove and destroy infected plants, avoid wet foliage, and contact your local agriculture office quickly."),
    (["yellow", "yellowing", "pivla", "peela"],
     "Yellow leaves can mean too much or too little water, nitrogen shortage, root problems or disease. "
     "Check soil moisture and drainage first, look under leaves for pests, and note whether old or new leaves are yellow."),
    (["water", "irrigat", "paani", "pani"],
     "Water deeply but less often, near the roots, in the early morning. Avoid keeping leaves wet. "
     "Use mulch to hold moisture. Check the soil 5 cm down: if dry, irrigate."),
    (["fertiliz", "npk", "urea", "khat", "khad"],
     "A soil test is the best guide for fertilizer. Nitrogen helps leaf growth, phosphorus roots and flowering, "
     "potassium fruit quality. Adding compost or farmyard manure improves soil over time."),
    (["soil", "mitti", "maati"],
     "Healthy soil has good drainage and organic matter. Add compost, rotate crops, and test soil every 1-2 years "
     "through a local soil testing lab."),
    (["aphid", "pest", "insect", "keet", "kid"],
     "For common pests: inspect the underside of leaves weekly, remove affected parts, use yellow sticky traps, "
     "and try neem-based sprays before stronger chemicals. Follow label directions for any product."),
    (["organic", "neem", "compost"],
     "Organic options: compost and vermicompost for nutrition, neem oil spray for soft-bodied pests, "
     "crop rotation and intercropping to reduce disease build-up."),
    (["spray", "pesticide", "fungicide"],
     "Spray in calm weather (low wind) in the early morning or evening, never before rain. "
     "Wear gloves and a mask, use only locally registered products at label dose, and keep children and animals away."),
    (["tomato"],
     "Tomato care: stake plants, water at the base, remove lower leaves touching soil, and watch for early blight, "
     "late blight and leaf curl. Rotate with non-solanaceous crops."),
    (["potato"],
     "Potato care: use healthy seed tubers, hill up soil around plants, avoid waterlogging, and watch for blight in cool, wet weather."),
    (["season", "kharif", "rabi", "sow", "when to plant"],
     "Kharif crops are sown with the monsoon (June-July): rice, maize, cotton, soybean. Rabi crops are sown in "
     "October-November: wheat, gram, mustard. Check your local agriculture office for the best dates in your area."),
]

FALLBACK = (
    "I can help with crop diseases, watering, fertilizer, soil, pests and spraying. "
    "Try a question like \"How do I control early blight on tomato?\" or \"When should I water my crop?\". "
    "For serious problems, please also contact your local agricultural officer."
)


def knowledge_base_answer(question: str) -> str:
    q = question.lower()
    hits = [text for keys, text in KNOWLEDGE_BASE if any(k in q for k in keys)]
    if not hits:
        return FALLBACK
    return "\n\n".join(hits[:2])


def claude_available() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def answer(messages: list, scan_context: str = "") -> dict:
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    if claude_available():
        try:
            from anthropic import Anthropic
            client = Anthropic()
            system = SYSTEM_PROMPT
            if scan_context:
                system += f"\n\nThe user's latest leaf scan result (may be a demo/sample result): {scan_context}"
            resp = client.messages.create(
                model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5"),
                max_tokens=700,
                system=system,
                messages=messages,
            )
            text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
            if text:
                return {"reply": text, "source": "claude"}
        except Exception as exc:  # fall back instead of failing the chat
            return {
                "reply": knowledge_base_answer(last_user),
                "source": "knowledge_base",
                "note": f"AI service unavailable ({type(exc).__name__}); showing built-in answer.",
            }
    return {"reply": knowledge_base_answer(last_user), "source": "knowledge_base"}