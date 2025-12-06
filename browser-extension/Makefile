.PHONY: key id setup

setup: .env
	pnpm install

key: key.pem
	@openssl rsa -in $< -pubout -outform DER | openssl base64 -A

id: key.pem
	@openssl rsa -in $< -pubout -outform DER | shasum -a 256 | head -c32 | tr 0-9a-f a-p

key.pem:
	@openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem

.env:
	cp .env.example .env
