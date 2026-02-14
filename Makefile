SHELL := /bin/bash

.PHONY: codex-cloud-preclone codex-cloud-clone

codex-cloud-preclone:
	bash scripts/codex-cloud/preclone.sh

codex-cloud-clone:
	bash scripts/codex-cloud/clone.sh
