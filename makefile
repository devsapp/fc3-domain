statistics:
	@wget -q https://images.devsapp.cn/tools/git-statistics.sh && bash git-statistics.sh && rm git-statistics.sh

release-dev:
	gsed -i "s/^Version: .*/Version: dev/" publish.yaml; \
	git diff --exit-code; \
	npm run publish

update-version:
	current_version=$$(curl -s https://api.devsapp.cn/v3/packages/fc3-domain/release/latest | jq -r '.body.tag_name'); \
	echo $$current_version;\
	major_version=$$(echo $$current_version | cut -d"." -f1); \
	minor_version=$$(echo $$current_version | cut -d"." -f2); \
	patch_version=$$(echo $$current_version | cut -d"." -f3); \
	new_patch_version=$$((patch_version + 1)); \
	new_version=$$major_version.$$minor_version.$$new_patch_version; \
	echo $$new_version;\
	sed -i "s/^Version: .*/Version: $$new_version/" publish.yaml; \
	git diff --exit-code || true

release-prod: update-version
	npm run publish