include ../browser-extension/.env
export

SRCS = $(wildcard src/*.ts)
ifeq ($(OS),Windows_NT)
	EXECUTABLE = dist/index.exe
	POSTJECT_OPTIONS =
else
	EXECUTABLE = dist/index
ifeq ($(shell uname -s),Darwin)
	POSTJECT_OPTIONS = --macho-segment-name NODE_SEA
else
	POSTJECT_OPTIONS =
endif
endif

EXECUTABLE_BASE = $(EXECUTABLE).org
NATIVE_HOST_NAME = $(VITE_NATIVE_HOST_NAME)

.PHONY: setup build clean _codesign _remove_sign install _copy/manifest.json _copy/$(EXECUTABLE)

setup:
	pnpm install

build: $(EXECUTABLE)

$(EXECUTABLE): dist/index.cjs dist/index.blob $(EXECUTABLE_BASE)
	cp $(EXECUTABLE_BASE) $(EXECUTABLE)
	pnpm exec postject $(EXECUTABLE) NODE_SEA_BLOB dist/index.blob \
	--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
	$(POSTJECT_OPTIONS)
	$(MAKE) _codesign

_codesign:
ifeq ($(OS),Windows_NT)
# 	signtool sign /fd SHA256 $(EXECUTABLE)
else ifeq ($(shell uname -s),Darwin)
	codesign --sign - $(EXECUTABLE)
endif

dist/index.cjs: $(SRCS)
	pnpm build

dist/index.blob: dist/index.cjs
	node --experimental-sea-config sea-config.json

# https://nodejs.org/api/single-executable-applications.html
# command -v node が使われいるが、nodenv とかで切り替えている場合、実行ファイルを取得できないため、全部 copyFileSync に変更
$(EXECUTABLE_BASE):
	node -e "require('fs').copyFileSync(process.execPath, '$@')"
	$(MAKE) _remove_sign

_remove_sign:
ifeq ($(OS),Windows_NT)
# 	signtool remove /s $(EXECUTABLE_BASE)
else ifeq ($(shell uname -s),Darwin)
	codesign --remove-signature $(EXECUTABLE_BASE)
endif

install: _copy/manifest.json _copy/$(EXECUTABLE)

manifest.json:
	$(eval EXTENSION_ORIGIN := $(shell make -C ../browser-extension id))
	node -e " \
		const m = require('./manifest.template.json'); \
		const os = require('os'); \
		const { resolve } = require('path'); \
		m.path = resolve(os.homedir(), '$(NATIVE_HOST_NAME)'); \
		m.name = '$(NATIVE_HOST_NAME)'; \
		m.allowed_origins = ['chrome-extension://$(EXTENSION_ORIGIN)/']; \
		console.log(JSON.stringify(m, null, 2))" > manifest.json

_copy/manifest.json: manifest.json
ifeq ($(OS),Windows_NT)
# .reg file...
# https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging?hl=ja#native-messaging-host-location
else
ifeq ($(shell uname -s),Darwin)
	mkdir -p $(HOME)/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
	cp manifest.json $(HOME)/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/$(NATIVE_HOST_NAME).json
else
	mkdir -p $(HOME)/.config/google-chrome/NativeMessagingHosts
	cp manifest.json $(HOME)/.config/google-chrome/NativeMessagingHosts/$(NATIVE_HOST_NAME).json
endif
endif

_copy/$(EXECUTABLE):
	cp $(EXECUTABLE) $(HOME)/$(NATIVE_HOST_NAME)

clean:
	@rm -rf dist manifest.json
