import re
from urllib.parse import urlparse

def extract_features(URL):
    features = {}

    # Basic features
    features['url_length'] = len(URL)  # Length of the URL
    features['num_digits'] = sum(c.isdigit() for c in URL)  # Number of digits in the URL
    features['num_special_chars'] = len(re.findall(r'\W', URL))  # Number of special characters

    # Protocol related features
    features['has_http'] = 1 if re.search(r'http://|https://', URL) else 0  # Presence of 'http://' or 'https://'
    features['has_https'] = 1 if URL.startswith('https') else 0  # Presence of 'https://' at the beginning

    # Domain related features
    parsed_url = urlparse(URL)
    domain = parsed_url.netloc
    path = parsed_url.path

    features['num_dots'] = domain.count('.')  # Number of dots in the domain
    features['num_hyphens'] = domain.count('-')  # Number of hyphens in the domain
    features['domain_length'] = len(domain)  # Length of the domain
    features['num_params'] = URL.count('?')  # Number of parameters in the URL
    features['path_length'] = len(path)  # Length of the URL path

    # Additional phishing detection features
    features['has_ip_address'] = 1 if re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', domain) else 0  # Presence of IP address in domain
    features['is_shortened'] = 1 if re.search(r'bit\.ly|goo\.gl|t\.co|tinyurl\.com', domain) else 0  # Check for URL shortening services
    features['has_at_symbol'] = 1 if '@' in URL else 0  # Presence of '@' symbol in URL
    features['num_subdomains'] = domain.count('.') - 1  # Number of subdomains
    features['has_malformed_url'] = 1 if re.search(r'http:\/|https:\/', URL) else 0  # Check for malformed URLs
    features['num_encoded_chars'] = URL.count('%')  # Number of encoded characters in URL
    features['has_suspicious_tld'] = 1 if domain.endswith(('.tk', '.ml', '.ga', '.cf', '.gq')) else 0  # Check for suspicious top-level domains (TLDs)

    return features

# Example usage
URL = "http://example.com"
features = extract_features(URL)
print(features)
