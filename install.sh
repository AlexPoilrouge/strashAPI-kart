#!/bin/bash

echoerr() { echo "$@" 1>&2; }

usage() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo -e "\t-d, --docker_testing \t tells that the install is targeting a docker contained environnement"
    echo -e "\t-v, --variables_file \t specifies the variables YAML file for install"
    echo -e "\t-h, --help \t\t shows this help"
    exit 0
}

depend_check() {
    for arg; do
		hash "$arg" 2>/dev/null || { echoerr "Error: Could not find \"$arg\" application."; exit 2; }
    done    
}

SCRIPT_DIR="$( realpath "$( dirname "$0" )" )"

cd "$SCRIPT_DIR"

if ! [ "$( id -u )" = 0 ]; then
   echo "$0 must be run with root privileges…"
   exit 1
fi

depend_check "sudo"
depend_check "git"
depend_check "make"
depend_check "ansible-playbook"
depend_check "yq"

ANSIBLE_DIR="${SCRIPT_DIR}/config/ansible"
VARIABLES_YAML="${ANSIBLE_DIR}/variables.yaml"
MAKE_OPT=""

OPTIONS=$(getopt -o dhv: --long docker_testing,help,variables_file: -- "$@")

eval set -- "${OPTIONS}"
# Process the options
while true; do
    case "$1" in
        -d | --docker_testing ) MAKE_OPT="${MAKE_OPT} ANSIBLE_DOCKER_TEST_FLAG=true"; shift ;;
        -v | --variables_file )
              VARIABLES_YAML="$2"
              MAKE_OPT="${MAKE_OPT} ANSIBLE_VARIABLES=$2"
              shift 2
              ;;
        -h | --help ) usage; shift;;
        -- ) shift; break ;;
        * ) break ;;
    esac
done


eval make -C "${ANSIBLE_DIR}" local_install LOCAL_SOURCE_DIR="${SCRIPT_DIR}" "${MAKE_OPT}"


# ANSIBLE_ROOT_DIR="$( yq '.root_dir' "${VARIABLES_YAML}" | tr -d '"' )"
# ANSIBLE_INSTALL_DIR="$( yq '.install_dir' "${VARIABLES_YAML}" | tr -d '"' )"
# INSTALL_DIR="$( realpath "${ANSIBLE_ROOT_DIR}/${ANSIBLE_INSTALL_DIR}" )"

# STRASHBOT_USER="$( yq '.strashbot.username' "${VARIABLES_YAML}" | tr -d '"' )"

echo "End."
