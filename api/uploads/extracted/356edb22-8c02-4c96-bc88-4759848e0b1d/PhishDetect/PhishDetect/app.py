import pandas as pd  # type: ignore
import joblib # type: ignore
from feature_extraction import extract_features
from flask import Flask, request, render_template # type: ignore

app = Flask(__name__)

def predict_URL(URL):
    model = joblib.load('phishing_model.pkl')
    features = extract_features(URL)
    features_df = pd.DataFrame([features])
    prediction = model.predict(features_df)[0]
    prediction_proba = model.predict_proba(features_df)[0]
    confidence = max(prediction_proba) * 100
    return prediction, confidence

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    URL = request.form['URL']
    result, confidence = predict_URL(URL)
    result_text = False if result == 1 else True
    return render_template('results.html', url=URL, result=result_text, confidence=confidence)

if __name__ == '__main__':
    app.run(debug=True)
