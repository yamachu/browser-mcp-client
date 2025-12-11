NATIVE_HOST=../native-host/dist/index

.PHONY: run

run: ARGS=
run:
	@node --env-file .env ./src/index.ts $(NATIVE_HOST) $(ARGS)
