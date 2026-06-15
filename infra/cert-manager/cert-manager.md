# Allow 443 and 80 ports in the firewall

# Install cert-manager

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Create a ClusterIssuer

kubectl apply -f cluster-issuer.yaml

# Create a Certificate

kubectl apply -f certificate.yaml