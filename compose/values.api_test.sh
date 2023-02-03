export LOCAL_SCRIPT_DIR="$( realpath "$( dirname $0 )" )"
export ROOT_DIR="$( realpath ${LOCAL_SCRIPT_DIR}/.. )"


export API_TEST_SERVER_ADDR="api_server"
export API_TEST_API_ROOT="kart"

export TEMPLATE_SRC_API_TEST="test_config.json.template"
export TEMPLATE_DEST_API_TEST="${ROOT_DIR}/config/test_config.json"



export AUTH_ADMIN_KEY_FILEPATH="test/config/admin_jwtRS256.key.pub"
export AUTH_DISCORD_USER_KEY_FILEPATH="test/config/jwtRS256.key.pub"

export TEMPLATE_SRC_AUTH_ADMIN="key.json.template"
export TEMPLATE_DEST_AUTH_ADMIN="${ROOT_DIR}/config/auth/key.json"



export TEMPLATES=( "API_TEST" "AUTH_ADMIN" )
