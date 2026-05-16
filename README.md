# RetentionAI
**Customer Churn Prediction System**

RetentionAI is a dual-mode, full-stack application designed to predict, explain, and actively prevent customer churn. It bridges the gap between raw data science and actionable business strategy by providing live predictive analytics, Explainable AI (SHAP), and Generative AI retention scripts.

## Key Features

### 1. Dual-Mode Architecture
* **Agent Workspace:** A step-by-step interactive questionnaire for customer success agents on active calls. Input customer data to get real-time churn probability.
* **Management Console:** A bulk-processing dashboard for business managers. Upload a `.csv` billing file to instantly analyze hundreds of customers, view KPI summaries, and generate a prioritized intervention list.

### 2. Explainable AI (SHAP)
Predicting churn isn't enough; you need to know *why*. The system uses **SHAP (SHapley Additive exPlanations)** to break down the exact mathematical drivers pushing a customer toward or away from churning (e.g., "Month-to-month contract is escalating risk").

### 3. Generative AI Rescue Strategies
Integrated with **Google's Gemini 2.5 Flash**, the app takes the specific SHAP drivers of a high-risk customer and instantly generates a highly personalized, empathetic, 3-sentence script for the call center agent to read in order to save the account.

---

## Tech Stack

**Frontend (Mobile & Web)**
* **Framework:** React Native / Expo
* **Routing/Navigation:** React Native State Management
* **File Handling:** `expo-document-picker` & `FormData` API

**Backend (API)**
* **Framework:** FastAPI (Python)
* **Server:** Uvicorn
* **File Processing:** `python-multipart`

**Machine Learning & AI**
* **Algorithm:** XGBoost (`XGBClassifier`)
* **Data Processing:** Pandas, NumPy, Scikit-Learn
* **Interpretability:** SHAP (`TreeExplainer`)
* **Generative AI:** `google-genai` (Gemini 2.5 Flash)

---

## The Machine Learning Model

The core prediction engine is powered by an **XGBoost (Extreme Gradient Boosting)** classifier, chosen specifically for its dominance on tabular data and native handling of class imbalances.

* **Target Variable:** `Churn` (1 = Churn Risk, 0 = Loyal)
* **Class Imbalance Handling:** Utilizes `scale_pos_weight` during training to heavily penalize the model for missing actual churners, drastically improving Recall.
* **Threshold Tuning:** Hardcoded to a mathematically optimized decision threshold of `0.5857` (rather than the default 0.5) to maximize the F1-Score and balance false positives/negatives.
* **Feature Optimization:** Originally trained on 21 variables, mathematically trimmed down to the **Top 9** most impactful features (accounting for >95% of predictive power) to streamline data entry and API speed.

---

## 📂 The Dataset Structure

The system expects customer data containing the following 9 essential features:

1. `tenure` (Numeric - Months)
2. `MonthlyCharges` (Numeric - $)
3. `TotalCharges` (Numeric - $)
4. `Contract` (Categorical: Month-to-month, One year, Two year)
5. `InternetService` (Categorical: DSL, Fiber optic, No)
6. `OnlineSecurity` (Categorical: No, Yes, No internet service)
7. `TechSupport` (Categorical: No, Yes, No internet service)
8. `PaperlessBilling` (Categorical: No, Yes)
9. `PaymentMethod` (Categorical: Bank transfer, Credit card, Electronic check, Mailed check)

---

## Setup & Installation

### Prerequisites
* Python 3.9+
* Node.js & npm
* Google Gemini API Key

### 1. Backend Setup (FastAPI)
Navigate to your backend directory:

```bash
# Install required Python packages
pip install -r requirements.txt

# Ensure your trained model (.pkl) and scaler (.pkl) are in the root directory.

# Add your Gemini API Key
# Open main.py and replace "YOUR_GEMINI_API_KEY" with your actual key.

# Start the local server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend will be live at `http://127.0.0.1:8000`*

### 2. Frontend Setup (React Native / Expo)
Navigate to your frontend directory:

```bash
# Install Expo and dependencies
npm install
npx expo install expo-document-picker react-native-web react-dom @expo/metro-runtime

# Ensure React DOM versions match
npm install react-dom@19.2.5

# Configure API Endpoint
# Open App.js and update `BACKEND_URL` to point to your FastAPI server IP.

# Start the Expo development server (Web Mode)
npx expo start -c --web
```

---

## Usage Instructions

**For the Agent Workspace:**
1. Click **Agent Workspace** from the Home Screen.
2. Answer the 9 interactive questions regarding the customer's current profile.
3. Click **Execute Analysis**.
4. If flagged as **High Risk**, click **Generate AI Retention Strategy** to receive your custom script.

**For the Management Console:**
1. Export a valid CSV from your billing database containing the 9 required columns.
2. Click **Management Console** -> **Upload Dataset**.
3. The system will process the batch, filter out loyal customers, and display a prioritized dashboard of high-risk accounts alongside their specific SHAP risk drivers.
