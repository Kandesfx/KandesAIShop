#!/usr/bin/env bash
# =============================================================================
#  Kandes.shop - Claude Code Installer (Claude Code only)
#  Platforms : macOS / Linux (bash 3.2+)
#  Author    : Kandes.shop
#  Repo      : https://kandes.shop
# =============================================================================
#
#  Usage (one-line, no download needed):
#    curl -fsSL https://kandes.shop/install/claude/claude-config-kandes.sh | bash
#
#  What it does:
#    1. Prompts for your Kandes API key (masked on TTY)
#    2. Writes:
#         ~/.claude/settings.json (env block with ANTHROPIC_* keys)
#    3. Preserves any user-customised settings by merging into the env block
#    4. Verifies the file is readable + the key was written correctly
#
#  Tip: If you also need Codex CLI, run the Codex installer instead:
#       curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | bash
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
#  Configuration constants
# -----------------------------------------------------------------------------
readonly KANDES_BASE_URL='https://api.kandes.shop'
readonly KANDES_BRAND='Kandes.shop'
readonly SCRIPT_VERSION='1.2.0'

# -----------------------------------------------------------------------------
#  Terminal colour helpers (auto-disabled when not a TTY)
# -----------------------------------------------------------------------------
if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ -n "${TERM:-}" ] && [ "${TERM:-}" != 'dumb' ]; then
    C_RESET=$(tput sgr0)
    C_BOLD=$(tput bold)
    C_DIM=$(tput dim 2>/dev/null || true)
    C_RED=$(tput setaf 1)
    C_GREEN=$(tput setaf 2)
    C_YELLOW=$(tput setaf 3)
    C_BLUE=$(tput setaf 4)
    C_MAGENTA=$(tput setaf 5)
    C_CYAN=$(tput setaf 6)
    C_WHITE=$(tput setaf 7)
else
    C_RESET=''; C_BOLD=''; C_DIM=''; C_RED=''; C_GREEN=''
    C_YELLOW=''; C_BLUE=''; C_MAGENTA=''; C_CYAN=''; C_WHITE=''
fi

# -----------------------------------------------------------------------------
#  Logging
# -----------------------------------------------------------------------------
log_info()  { printf '%s\n' "${C_CYAN}[INFO]${C_RESET}  $*" >&2; }
log_ok()    { printf '%s\n' "${C_GREEN}[OK]${C_RESET}    $*" >&2; }
log_warn()  { printf '%s\n' "${C_YELLOW}[WARN]${C_RESET}  $*" >&2; }
log_err()   { printf '%s\n' "${C_RED}[ERR]${C_RESET}   $*" >&2; }

# -----------------------------------------------------------------------------
#  Pretty printing
# -----------------------------------------------------------------------------
banner() {
    printf '\n'
    printf '%s' "${C_MAGENTA}${C_BOLD}"
    cat <<'EOF'
   ╺┳ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳╸
    ┃                                                                   ┃
    ┃                  Claude Code Installer  v1.2.0                     ┃
    ┃                  Base URL : https://api.kandes.shop/v1             ┃
    ┃                                                                   ┃
   ┗┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳┛
EOF
    printf '%s\n' "${C_RESET}"
}

section() {
    printf '\n%s%s%s\n' "${C_BOLD}${C_BLUE}" "─── $* ───" "${C_RESET}"
}

# -----------------------------------------------------------------------------
#  Input helpers
# -----------------------------------------------------------------------------
prompt_secret() {
    local prompt="$1" var="" ch=""
    if [ -t 0 ] && command -v stty >/dev/null 2>&1; then
        printf '%s' "${C_BOLD}${prompt}${C_RESET}: " >&2
        stty -echo -icanon min 1 time 0 2>/dev/null || true
        while IFS= read -r -n1 ch; do
            case "$ch" in
                $'\0'|$'\n'|$'\r') break ;;
                $'\177'|$'\b')
                    if [ -n "$var" ]; then
                        var="${var%?}"
                        printf '\b \b' >&2
                    fi ;;
                *) var="${var}${ch}"; printf '*' >&2 ;;
            esac
        done
        stty echo icanon 2>/dev/null || true
        printf '\n' >&2
    else
        if [ -r /dev/tty ]; then
            printf '%s' "${C_BOLD}${prompt}${C_RESET}: " </dev/tty >&2
            read -r var </dev/tty
        else
            printf '%s' "${C_BOLD}${prompt}${C_RESET}: " >&2
            read -r var
        fi
    fi
    REPLY=$(printf '%s' "${var}" | tr -d '[:space:]')
}

# -----------------------------------------------------------------------------
#  Path helpers
# -----------------------------------------------------------------------------
user_home() {
    printf '%s' "${HOME:-$(getent passwd "$(id -u)" 2>/dev/null | cut -d: -f6)}"
}

ensure_dir() {
    [ -d "$1" ] || mkdir -p "$1"
}

# -----------------------------------------------------------------------------
#  Claude Code writer (~/.claude/settings.json env block)
#  Logic: identical to codex-config-kandes.sh::write_claude_config — preserved
#  here as a standalone script so users can install Claude without going
#  through the Codex menu.
# -----------------------------------------------------------------------------
write_claude_config() {
    local base_url="$1" api_key="$2"
    local home claude_dir settings_file jq_bin

    home=$(user_home)
    claude_dir="${home}/.claude"
    settings_file="${claude_dir}/settings.json"

    ensure_dir "$claude_dir"

    section 'Writing Claude Code config'

    jq_bin=''
    if command -v jq >/dev/null 2>&1; then
        jq_bin='jq'
    elif command -v python3 >/dev/null 2>&1; then
        jq_bin='python3'
    elif command -v python >/dev/null 2>&1; then
        jq_bin='python'
    elif command -v node >/dev/null 2>&1; then
        jq_bin='node'
    fi

    if [ -z "$jq_bin" ]; then
        log_err "Could not find jq, python, or node to safely merge JSON."
        log_err "Please install one of them and re-run, or edit $settings_file manually."
        return 1
    fi
    log_info "Using $jq_bin for JSON merge"

    local merged_json
    case "$jq_bin" in
        jq)
            merged_json=$(
                jq -n --arg url "$base_url" --arg key "$api_key" '
                    { env: (
                        { ANTHROPIC_BASE_URL: $url
                        , ANTHROPIC_API_KEY:  $key
                        , ANTHROPIC_AUTH_TOKEN: $key
                        , CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1"
                        } as $k
                        | (input? // {}) as $existing
                        | $existing * $k
                        | with_entries(if .key == "env" then .value = ($existing.env // {}) * $k else . end)
                    )}
                ' "$settings_file" 2>/dev/null || \
                jq -n --arg url "$base_url" --arg key "$api_key" '
                    { env: {
                          ANTHROPIC_BASE_URL: $url
                        , ANTHROPIC_API_KEY:  $key
                        , ANTHROPIC_AUTH_TOKEN: $key
                        , CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1"
                    }}
                '
            ) ;;
        python*)
            merged_json=$(
                "$jq_bin" -c '
import json, sys
url, key = sys.argv[1], sys.argv[2]
kandes = {
    "ANTHROPIC_BASE_URL": url,
    "ANTHROPIC_API_KEY": key,
    "ANTHROPIC_AUTH_TOKEN": key,
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
}
existing = {}
try:
    with open(sys.argv[3]) as f:
        existing = json.load(f)
except Exception:
    pass
existing["env"] = {**kandes, **(existing.get("env") or {})}
print(json.dumps(existing, indent=2))
                ' "$base_url" "$api_key" "$settings_file"
            ) ;;
        node)
            merged_json=$(
                node -e '
const fs=require("fs");
const url=process.argv[1], key=process.argv[2], file=process.argv[3];
let cur={};
try{cur=JSON.parse(fs.readFileSync(file,"utf8"))}catch{}
cur.env = Object.assign({
  ANTHROPIC_BASE_URL: url,
  ANTHROPIC_API_KEY:  key,
  ANTHROPIC_AUTH_TOKEN: key,
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
}, cur.env||{});
process.stdout.write(JSON.stringify(cur,null,2)+"\n");
' "$base_url" "$api_key" "$settings_file"
            ) ;;
    esac

    if [ -z "$merged_json" ]; then
        log_err "JSON merge produced empty output"
        return 1
    fi

    printf '%s\n' "$merged_json" > "$settings_file"

    if grep -q "$base_url" "$settings_file" 2>/dev/null && \
       grep -q "$api_key" "$settings_file" 2>/dev/null; then
        log_ok "settings.json saved: $settings_file"
    else
        log_err "Verification failed: $settings_file"
        return 1
    fi

    return 0
}

# -----------------------------------------------------------------------------
#  API key prompt
# -----------------------------------------------------------------------------
prompt_api_key() {
    section 'API key'
    printf '%sEnter your Kandes API key (paste then press Enter).%s\n' \
        "${C_DIM}" "${C_RESET}" >&2
    printf '%sFind it in your Kandes dashboard: https://kandes.shop/account%s\n' \
        "${C_DIM}" "${C_RESET}" >&2

    local key=''
    while [ -z "$key" ]; do
        prompt_secret 'API Key'
        key="$REPLY"
        if [ -z "$key" ]; then
            log_err "API Key cannot be empty"
        fi
    done
    printf '%s' "$key"
}

# -----------------------------------------------------------------------------
#  Final summary
# -----------------------------------------------------------------------------
print_summary() {
    local installed_for="$1" key="$2"
    local preview
    if [ "${#key}" -ge 8 ]; then
        preview="${key:0:8}…"
    else
        preview="$key"
    fi

    section 'Setup Complete'
    printf '\n'
    printf '%s  %sInstalled for%s : %s\n' "${C_BOLD}" "${C_WHITE}" "${C_RESET}" "$installed_for"
    printf '%s  %sBase URL%s      : %s%s%s\n' "${C_BOLD}" "${C_WHITE}" "${C_RESET}" "${C_CYAN}" "$KANDES_BASE_URL" "${C_RESET}"
    printf '%s  %sAPI Key%s       : %s%s%s\n' "${C_BOLD}" "${C_WHITE}" "${C_RESET}" "${C_DIM}" "$preview" "${C_RESET}"
    printf '\n'
    printf '%sRun %sclaude%s to get started.%s\n' \
        "${C_DIM}" "${C_GREEN}${C_BOLD}" "${C_RESET}${C_DIM}" "${C_RESET}"
    printf '%sNeed help? https://kandes.shop/docs/api%s\n\n' \
        "${C_DIM}" "${C_RESET}"
}

# -----------------------------------------------------------------------------
#  Main
# -----------------------------------------------------------------------------
main() {
    local api_key
    banner

    # Support --api-key for non-interactive use
    while [ "$#" -gt 0 ]; do
        case "$1" in
            -k|--api-key)
                [ "$#" -ge 2 ] || { log_err "Missing value for $1"; exit 2; }
                api_key="$2"
                shift 2 ;;
            --api-key=*)
                api_key="${1#--api-key=}"
                shift ;;
            -h|--help)
                printf 'Usage: bash %s [--api-key <KEY>]\n' "$0"
                printf '\nWith no flags, prompts for the API key interactively.\n'
                exit 0 ;;
            *)
                log_err "Unknown flag: $1 (try --help)"
                exit 2 ;;
        esac
    done

    if [ -z "${api_key:-}" ]; then
        api_key="$(prompt_api_key)"
    fi

    if ! write_claude_config "$KANDES_BASE_URL" "$api_key"; then
        exit 1
    fi

    print_summary 'Claude Code' "$api_key"
}

main "$@"
