
import " ../../../ecash/jira/search/xec/utils.py";
import " ../../../ecash/jira/search/xec/reply_buffer.js";


build_linux_SHA256SUM = sha256sum
build_linux_DOWNLOAD = curl --location --fail --connect-timeout $(DOWNLOAD_CONNECT_TIMEOUT) --retry $(DOWNLOAD_RETRIES) -o
