DISEASES = {
    "tomato_early_blight": {
        "crop": "Tomato",
        "disease": "Early blight",
        "symptoms": ["Brown spots with concentric, target-like rings", "Older leaves often affected first", "Yellowing may develop around spots"],
        "prevention": ["Avoid overhead watering where possible", "Improve airflow and avoid overcrowding", "Remove infected plant debris and rotate crops"],
        "care": "Confirm the diagnosis before treatment. Remove badly affected leaves when practical and avoid working with wet foliage. If disease pressure persists, consult a local agricultural extension officer about locally registered products and follow the product label exactly."
    },
    "tomato_late_blight": {
        "crop": "Tomato",
        "disease": "Late blight",
        "symptoms": ["Water-soaked, irregular dark lesions", "Rapidly expanding brown or black patches", "White growth may appear on leaf undersides in humid conditions"],
        "prevention": ["Avoid prolonged leaf wetness", "Remove infected plants or debris according to local guidance", "Monitor nearby plants during cool, wet weather"],
        "care": "Late blight can spread quickly. Seek prompt local agricultural advice and confirm the diagnosis. Use only locally registered products for the crop and disease, following the label and pre-harvest interval."
    },
    "tomato_healthy": {
        "crop": "Tomato",
        "disease": "No disease detected in this class",
        "symptoms": ["The model's healthy class is the closest match"],
        "prevention": ["Inspect plants regularly", "Water near the soil and maintain airflow", "Use clean tools and healthy seedlings"],
        "care": "This result does not guarantee the plant is disease-free. Check the whole plant and rescan a clear image if symptoms remain."
    },
    "potato_early_blight": {
        "crop": "Potato",
        "disease": "Early blight",
        "symptoms": ["Dark lesions, often with concentric rings", "Older leaves may yellow and dry"],
        "prevention": ["Rotate crops", "Avoid plant stress where possible", "Remove crop residues and maintain balanced nutrition"],
        "care": "Confirm the cause before treatment. Ask a local agricultural expert about registered options and always follow product label directions."
    },
    "potato_late_blight": {
        "crop": "Potato",
        "disease": "Late blight",
        "symptoms": ["Irregular dark lesions that can expand quickly", "In humid weather, pale growth may appear beneath leaves"],
        "prevention": ["Monitor crops closely in cool, wet weather", "Avoid prolonged leaf wetness", "Follow local guidance for managing infected plants"],
        "care": "This disease can be serious and fast-moving. Seek prompt local agricultural advice. Only use products registered for potato and the confirmed disease, according to their labels."
    },
    "potato_healthy": {
        "crop": "Potato",
        "disease": "No disease detected in this class",
        "symptoms": ["The model's healthy class is the closest match"],
        "prevention": ["Inspect plants weekly", "Use healthy seed tubers", "Maintain good drainage and crop hygiene"],
        "care": "A healthy-class prediction is not a guarantee. Rescan or consult an expert if the plant shows symptoms."
    }
}

def lookup_disease(class_name: str):
    normalized = class_name.lower().replace("___", "_").replace(" ", "_")
    for key, value in DISEASES.items():
        if key in normalized or normalized in key:
            return value
    parts = class_name.replace("___", " — ").replace("_", " ").split(" — ", 1)
    crop = parts[0].replace("_", " ").title() if parts else "Unknown crop"
    disease = parts[1].replace("_", " ").title() if len(parts) > 1 else class_name.replace("_", " ").title()
    return {
        "crop": crop,
        "disease": disease,
        "symptoms": ["Refer to a local crop disease guide to verify the symptoms."],
        "prevention": ["Inspect the whole plant and improve crop hygiene.", "Avoid unnecessary pesticide use."],
        "care": "This class has no curated treatment entry in this starter project. Confirm the diagnosis with an agricultural expert and use only locally registered products according to their labels."
    }
