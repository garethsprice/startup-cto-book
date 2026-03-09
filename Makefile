.PHONY: install build clean serve open

install: ## Install dependencies
	npm install

build: ## Build the site
	npm run build

clean: ## Remove build output
	rm -rf build

serve: build ## Build and serve locally on port 8000
	@echo "Serving at http://localhost:8000"
	@cd build/site && python3 -m http.server 8000

open: build ## Build and open in browser
	open build/site/index.html

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
