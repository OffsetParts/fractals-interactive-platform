# WebRTC Signaling Function Deployment

deploy-webrtc:
	cd functions/webrtc && gcloud functions deploy webrtc-signaling \
		--runtime nodejs18 \
		--trigger-http \
		--allow-unauthenticated \
		--memory 512MB \
		--timeout 60s \
		--region us-central1 \
		--entry-point handleSignaling