import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
from feature_extraction import extract_features  # Assuming you have defined extract_features function

# Load dataset
data = pd.read_csv('dataset.csv')  # Adjust path if necessary
data.columns = data.columns.str.strip()  # Strip any leading/trailing whitespace from column names

# Feature extraction
data['features'] = data['URL'].apply(extract_features)
feature_data = pd.DataFrame(data['features'].tolist())
X = feature_data
y = data['Label']

# Train model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Save model
joblib.dump(model, 'phishing_model.pkl')

# Predict function
def predict_URL(URL):
    model = joblib.load('phishing_model.pkl')
    features = extract_features(URL)
    features_df = pd.DataFrame([features])
    prediction = model.predict(features_df)[0]
    return prediction
