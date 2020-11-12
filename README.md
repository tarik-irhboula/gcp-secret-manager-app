# SECRET MANAGER APP

Small application for managing secrets on GCP project

# Usage

docker build -t secret-manager-app:1.0.1 .

docker run -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp/perfect-entry-295313-795a5eb38351.json -v /home/user/Downloads:/tmp/gcp -p 8080:8080 secret-manager-app:1.0.1 884285619948