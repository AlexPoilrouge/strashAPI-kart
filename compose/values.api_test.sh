export LOCAL_SCRIPT_DIR="$( realpath "$( dirname $0 )" )"
export ROOT_DIR="$( realpath ${LOCAL_SCRIPT_DIR}/.. )"


export API_TEST_SERVER_ADDR="api_server"
export API_TEST_API_ROOT="kart"

export TEMPLATE_SRC_API_TEST="test_config.json.template"
export TEMPLATE_DEST_API_TEST="${ROOT_DIR}/config/test_config.json"



export AUTH_ADMIN_KEY="9xmj2PMGz8PXnUmhSHdmv6R8jvCsUdeP"
export AUTH_DISCORD_USER_KEY="5pBrc0rQ9gOYUs1hPMbqtbq1DVYDoRHM"

export TEMPLATE_SRC_AUTH_ADMIN="key.json.template"
export TEMPLATE_DEST_AUTH_ADMIN="${ROOT_DIR}/config/auth/key.json"



export TEMPLATES=( "API_TEST" "AUTH_ADMIN" )
