.PHONY: docker-build build build-full build-pdf build-epub clean serve open convert

docker-build: ## Build the Docker image
	docker compose build

build: docker-build ## Build the site (Docker)
	docker compose run --rm antora npm run build

build-full: docker-build ## Build site + PDF + EPUB (Docker)
	docker compose run --rm antora npm run build:full

build-pdf: docker-build ## Build site + PDF (Docker)
	docker compose run --rm antora npm run build:pdf

build-epub: docker-build ## Build site + EPUB (Docker)
	docker compose run --rm antora npm run build:epub

clean: ## Remove build output
	rm -rf build

serve: build ## Build and serve locally on port 8000
	@echo "Serving at http://localhost:8000"
	@cd build/site && python3 -m http.server 8000

open: build ## Build and open in browser
	open build/site/index.html

convert: ## Convert Markdown drafts to AsciiDoc
	./scripts/convert-chapters.sh

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
