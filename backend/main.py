from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import shap
import io
from google import genai
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML Models
model = joblib.load('xgboost_churn_model.pkl')
scaler = joblib.load('scaler.pkl')
explainer = shap.TreeExplainer(model)

gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    raise ValueError("GEMINI_API_KEY is missing from environment variables!")

ai_client = genai.Client(api_key=gemini_key)

feature_names = [
    'Contract', 'tenure', 'MonthlyCharges', 'OnlineSecurity',
    'TotalCharges', 'TechSupport', 'PaymentMethod',
    'PaperlessBilling', 'InternetService'
]

class CustomerData(BaseModel):
    Contract: int; tenure: int; MonthlyCharges: float; OnlineSecurity: int
    TotalCharges: float; TechSupport: int; PaymentMethod: int; PaperlessBilling: int; InternetService: int

class ScriptRequest(BaseModel):
    tenure: int; MonthlyCharges: float; Contract: int; top_drivers: list

@app.post("/predict")
def predict_churn(data: CustomerData):
    try:
        input_data = pd.DataFrame([data.model_dump()])[feature_names]
        input_scaled = scaler.transform(input_data)
        
        probability = model.predict_proba(input_scaled)[0][1]
        threshold = 0.5857
        prediction = 1 if probability >= threshold else 0
        
        shap_vals = explainer.shap_values(input_scaled)[0]
        explanations = [{"feature": feature_names[i], "value": float(val)} for i, val in enumerate(shap_vals)]
        explanations.sort(key=lambda x: abs(x["value"]), reverse=True)
        
        formatted_explanations = [
            {"feature": exp["feature"], "direction": "Increased Risk" if exp["value"] > 0 else "Decreased Risk"} 
            for exp in explanations[:3]
        ]

        return {
            "churn_prediction": int(prediction), "churn_risk_probability": float(probability),
            "threshold_used": threshold, "top_drivers": formatted_explanations
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/generate_script")
def generate_retention_script(data: ScriptRequest):
    try:
        contract_map = {0: "Month-to-Month", 1: "One Year", 2: "Two Year"}
        drivers_str = ", ".join([f"{d['feature']} ({d['direction']})" for d in data.top_drivers])
        
        prompt = f"""
        You are an expert customer retention specialist. A customer is at high risk of churning.
        Context: Tenure: {data.tenure} months, Bill: ${data.MonthlyCharges}, Contract: {contract_map.get(data.Contract, 'Unknown')}
        Top churn drivers flagged by our ML model: {drivers_str}.
        Write a short, empathetic, and persuasive 3-sentence script for a call center agent to read to this customer. 
        Offer a logical solution based on their churn drivers.
        """
        response = ai_client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        return {"script": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_batch")
async def predict_batch(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
        df = df.dropna(subset=feature_names)
        original_df = df.copy()

        mapping_dicts = {
            'Contract': {'Month-to-month': 0, 'One year': 1, 'Two year': 2},
            'InternetService': {'DSL': 0, 'Fiber optic': 1, 'No': 2},
            'OnlineSecurity': {'No': 0, 'No internet service': 1, 'Yes': 2},
            'TechSupport': {'No': 0, 'No internet service': 1, 'Yes': 2},
            'PaperlessBilling': {'No': 0, 'Yes': 1},
            'PaymentMethod': {'Bank transfer (automatic)': 0, 'Credit card (automatic)': 1, 'Electronic check': 2, 'Mailed check': 3}
        }

        for col, mapping in mapping_dicts.items():
            if df[col].dtype == 'object':
                df[col] = df[col].map(mapping)
        
        X_batch = df[feature_names]
        X_scaled = scaler.transform(X_batch)
        probabilities = model.predict_proba(X_scaled)[:, 1]
        
        threshold = 0.5857
        predictions = np.where(probabilities >= threshold, 1, 0)
        
        # Extract indices of ONLY high-risk customers
        high_risk_indices = np.where(predictions == 1)[0]
        
        results_list = []
        
        # PERFORMANCE TWEAK: Only calculate SHAP for the high-risk subset
        if len(high_risk_indices) > 0:
            X_high_risk_scaled = X_scaled[high_risk_indices]
            shap_vals_batch = explainer.shap_values(X_high_risk_scaled)
            
            for i, idx in enumerate(high_risk_indices):
                shap_vals = shap_vals_batch[i]
                explanations = [{"feature": feature_names[j], "value": float(val)} for j, val in enumerate(shap_vals)]
                explanations.sort(key=lambda x: abs(x["value"]), reverse=True)
                
                top_explanations = [
                    {"feature": exp["feature"], "direction": "Increased Risk" if exp["value"] > 0 else "Decreased Risk"} 
                    for exp in explanations[:3]
                ]
                
                original_row = original_df.iloc[idx]
                results_list.append({
                    "customerID": original_row.get('customerID', f"Row-{idx}"),
                    "tenure": int(original_row['tenure']),
                    "MonthlyCharges": float(original_row['MonthlyCharges']),
                    "Risk_Probability": float(probabilities[idx]),
                    "top_drivers": top_explanations
                })

        # Sort the final list so the highest risk customers appear at the top
        results_list.sort(key=lambda x: x["Risk_Probability"], reverse=True)

        return {
            "total_processed": len(df),
            "total_high_risk": len(results_list),
            "high_risk_customers": results_list
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")