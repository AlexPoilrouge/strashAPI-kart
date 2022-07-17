export LOCAL_SCRIPT_DIR="$( realpath "$( dirname $0 )" )"
export ROOT_DIR="$( realpath ${LOCAL_SCRIPT_DIR}/.. )"



export STRASHBOT_IP_ADDRESS="193.70.41.86"
export STRASHBOT_GETMODE_CMD_TYPE="local"
#presumably a "strashbot" user exist when running the install script
#   (and holds the script below his homedir…) 
export STRASHBOT_GETMODE_CMD="sh \\\"$( getent passwd "strashbot" | cut -d: -f6 )/.srb2kart/addon_script.sh\\\" \\\"INFO_SERV\\\""

# naming of variable is important:
#   - TEMPLATE_SRC_{TEMPALTE_MODULE} to designate name of source template
#       (template files are always in install/templates directory)
#   - TEMPLATE_SRC_{TEMPALTE_MODULE} to designate the file that generate the
#        associated template
export TEMPLATE_SRC_STRASHBOT_INFO_JSON="strashbot_info.json.template"
export TEMPLATE_DEST_STRASHBOT_INFO_JSON="${ROOT_DIR}/config/info/strashbot_info.json"



export STRASH_API_ACCCESS_ADDR="127.0.0.1"
export STRASH_API_ACCESS_PORT="6029"
export STRASH_API_ACCCESS_SERVER_NAMES="strashbot.fr www.strashbot.fr"

export TEMPLATE_SRC_STRASH_API="nginx-strash-api.conf.template"
export TEMPLATE_DEST_STRASH_API="/etc/nginx/sites-enabled/nginx-strash-api.conf"



export STRASH_API_SERVICE_USER="strashbot"
export STRASH_API_SERVICE_WORKDIR="${ROOT_DIR}"

export TEMPLATE_SRC_STRASH_API_SERVICE="strash-api.service.template"
export TEMPLATE_DEST_STRASH_API_SERVICE="/etc/systemd/system/strash-api.service"



export STRASHBOT_SERVICE_CMD="sh \\\"$( getent passwd "strashbot" | cut -d: -f6 )/.srb2kart/addon_script.sh\\\" \\\"IS_ACTIVE_SERV\\\""
export STRASHBOT_SERVICE_CMD_TYPE="local"

export TEMPLATE_SRC_STRASHBOT_SERVICE_CMD="service.json.template"
export TEMPLATE_DEST_STRASHBOT_SERVICE_CMD="${ROOT_DIR}/config/service.json"



export CONFIG_API_HOST="localhost:6029"
export CONFIG_API_BASE_PATH="/"

export TEMPLATE_SRC_CONFIG_API="config.json.template"
export TEMPLATE_DEST_CONFIG_API="${ROOT_DIR}/config/config.json"




# The elements of this array are the tmeplates modules that take effect by being formated
#   formated and copied according to previously set variables
export TEMPLATES=( "STRASHBOT_INFO_JSON" "STRASH_API" "STRASH_API_SERVICE" "STRASHBOT_SERVICE_CMD" "CONFIG_API" )
