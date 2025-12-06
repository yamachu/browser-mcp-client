setup:
	$(MAKE) -C browser-extension setup
	$(MAKE) -C native-host setup

build:
	pnpm run -C browser-extension build
	$(MAKE) -C native-host build
