#!/usr/bin/env bash
# =============================================================================
#  Kandes.shop - Interactive Config Installer (Codex + Claude Code)
#  Platforms : macOS / Linux (bash 3.2+)
#  Author    : Kandes.shop
#  Repo      : https://kandes.shop
# =============================================================================
#
#  Usage (one-line, no download needed):
#    curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | bash
#
#  What it does:
#    1. Asks which tool(s) to configure: Codex CLI / Claude Code / Both / Cancel
#    2. Prompts for your Kandes API key (masked on TTY)
#    3. Writes:
#         Codex     -> ~/.codex/config.toml + ~/.codex/auth.json
#         Claude    -> ~/.claude/settings.json (env block)
#    4. Preserves any user-customised settings by stripping only the Kandes block
#    5. Verifies the file is readable + the key was written correctly
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
#  Configuration constants
# -----------------------------------------------------------------------------
readonly KANDES_BASE_URL='https://api.kandes.shop/v1'
readonly KANDES_BRAND='Kandes.shop'
readonly SCRIPT_VERSION='1.1.0'

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
    ┃   _  ___                    _    ___  _    _                       ┃
    ┃  | |/ / |                  | |  / _ \| |  (_)                      ┃
    ┃  | ' /| |__   __ _ _ __ ___| |_| | | | |__ _ _ __                 ┃
    ┃  |  < | '_ \ / _` | '__/ _ \ __| | | | '_ \| | '_ \                ┃
    ┃  | . \| | | | (_| | | |  __/ |_| |_| | | | | | | | |               ┃
    ┃  |_|\_\_| |_|\__,_|_|  \___|\__|\___/|_| |_|_| |_|_|               ┃
    ┃                                                                   ┃
    ┃              Interactive Config Installer  v1.1.0                  ┃
    ┃              Base URL : https://api.kandes.shop/v1                 ┃
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
    # Read a secret line; mask with '*' if the terminal supports it.
    local prompt="$1" var="" ch="" bs
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
        # Fallback for non-TTY (curl | bash piped from a file) — use /dev/tty
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

prompt_choice() {
    # Print menu and read 1..N until valid. Sets REPLY.
    local prompt="$1"; shift
    local -a opts=("$@")
    printf '\n%s%s%s\n' "${C_BOLD}${C_WHITE}" "$prompt" "${C_RESET}" >&2
    local i=1
    for opt in "${opts[@]}"; do
        printf '  %s%d)%s %s\n' "${C_CYAN}" "$i" "${C_RESET}" "$opt" >&2
        i=$((i + 1))
    done
    while :; do
        printf '%s' "${C_BOLD}Choose [1-${#opts[@]}]: ${C_RESET}" >&2
        local ans
        if [ -r /dev/tty ]; then
            read -r ans </dev/tty
        else
            read -r ans
        fi
        if [[ "$ans" =~ ^[0-9]+$ ]] && [ "$ans" -ge 1 ] && [ "$ans" -le "${#opts[@]}" ]; then
            REPLY=$ans
            return 0
        fi
        log_warn "Invalid choice: '$ans'"
    done
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
#  Codex CLI writer (~/.codex/config.toml + ~/.codex/auth.json)
# -----------------------------------------------------------------------------
write_codex_config() {
    local base_url="$1" api_key="$2"
    local home codex_dir config_file auth_file

    home=$(user_home)
    codex_dir="${home}/.codex"
    config_file="${codex_dir}/config.toml"
    auth_file="${codex_dir}/auth.json"

    ensure_dir "$codex_dir"

    section 'Writing Codex config'

    # ---- Build the Kandes TOML block ----
    local toml_block
    toml_block=$(cat <<EOF
model_provider = "KANDES"
model = "gpt-5.4"
model_reasoning_effort = "high"
disable_response_storage = true


[model_providers.KANDES]
name = "KANDES"
base_url = "${base_url}"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
EOF
)

    # ---- Merge with existing config.toml (strip managed keys + KANDES section) ----
    local final_toml="$toml_block"
    if [ -f "$config_file" ]; then
        log_info "Merging with existing $config_file"
        # Read file, drop Kandes-managed top-level keys + [model_providers.KANDES] section.
        local kept=""
        local in_kandes=0
        while IFS= read -r line || [ -n "$line" ]; do
            # Strip CR
            line="${line%$'\r'}"

            # Detect section header
            if [[ "$line" =~ ^[[:space:]]*\[model_providers\.KANDES\][[:space:]]*$ ]]; then
                in_kandes=1
                continue
            fi

            # End of Kandes section when a new section starts
            if [ "$in_kandes" = 1 ] && [[ "$line" =~ ^[[:space:]]*\[[^]]+\][[:space:]]*$ ]]; then
                in_kandes=0
            fi

            # Inside Kandes section -> drop
            if [ "$in_kandes" = 1 ]; then
                continue
            fi

            # Drop Kandes-managed top-level keys (preserve other settings)
            case "$line" in
                'model_provider ='*|'model = "gpt-'*|'model_reasoning_effort ='*|'disable_response_storage ='*) continue ;;
            esac

            kept="${kept}${line}"$'\n'
        done < "$config_file"

        # Trim leading/trailing blank lines
        kept=$(printf '%s' "$kept" | awk 'BEGIN{p=1} {if(p && NF==0) next; p=0; print} END{}' )
        kept=$(printf '%s' "$kept" | awk '{lines[NR]=$0} END{start=1; for(i=NR;i>=1;i--){if(lines[i]!=""){start=i+1;break}}; for(i=start;i<=NR;i++)print lines[i]}')

        if [ -n "$kept" ]; then
            final_toml="${toml_block}

${kept}"
        fi
    else
        log_info "Creating fresh $config_file"
    fi

    # Write UTF-8 without BOM (TOML parsers can choke on BOM)
    printf '%s\n' "$final_toml" > "$config_file"

    # ---- Verify ----
    if grep -q "${base_url}" "$config_file" 2>/dev/null; then
        log_ok "config.toml saved: $config_file"
    else
        log_err "Failed to write config.toml"
        return 1
    fi

    # ---- Write auth.json (JSON, just OPENAI_API_KEY) ----
    local auth_json
    auth_json=$(printf '{\n  "OPENAI_API_KEY": "%s"\n}\n' "$api_key")
    printf '%s' "$auth_json" > "$auth_file"

    if grep -q "$api_key" "$auth_file"; then
        log_ok "auth.json saved: $auth_file"
    else
        log_err "Failed to write auth.json"
        return 1
    fi

    return 0
}

# -----------------------------------------------------------------------------
#  Claude Code writer (~/.claude/settings.json env block)
# -----------------------------------------------------------------------------
write_claude_config() {
    local base_url="$1" api_key="$2"
    local home claude_dir settings_file
    local jq_bin

    home=$(user_home)
    claude_dir="${home}/.claude"
    settings_file="${claude_dir}/settings.json"

    ensure_dir "$claude_dir"

    section 'Writing Claude Code config'

    # Need a JSON tool. Prefer jq, fall back to python3, fall back to node.
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

    # Build a JSON object containing the Kandes env block, then merge with existing.
    # We use a heredoc + jq to do the merge safely (preserves comments-free JSON,
    # preserves user keys, only touches the kandes env vars).
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

    # ---- Verify ----
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
    API_KEY_GLOBAL="$key"
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
    printf '%sRun %scodex%s or %sclaude%s to get started.%s\n' \
        "${C_DIM}" "${C_GREEN}${C_BOLD}" "${C_RESET}${C_DIM}" "${C_GREEN}${C_BOLD}" "${C_RESET}${C_DIM}" "${C_RESET}"
    printf '%sNeed help? https://kandes.shop/docs/api%s\n\n' \
        "${C_DIM}" "${C_RESET}"
}

# -----------------------------------------------------------------------------
#  Main
# -----------------------------------------------------------------------------
main() {
    # ----- Parse CLI flags (non-interactive mode) -----
    #   -t, --tool       <codex|claude|both>
    #   -k, --api-key    <KEY>
    #   -y, --yes        accept defaults / skip confirms
    #   -h, --help       show usage
    local TOOLS_CHOSEN=''
    local API_KEY_GLOBAL=''
    local ASSUME_YES=0
    while [ "$#" -gt 0 ]; do
        case "$1" in
            -t|--tool)
                [ "$#" -ge 2 ] || { log_err "Missing value for $1"; exit 2; }
                case "$2" in
                    codex|claude|both) TOOLS_CHOSEN="$2" ;;
                    *) log_err "Invalid --tool value: $2 (expected: codex|claude|both)"; exit 2 ;;
                esac
                shift 2 ;;
            --tool=*)
                TOOLS_CHOSEN="${1#--tool=}"
                case "$TOOLS_CHOSEN" in
                    codex|claude|both) ;;
                    *) log_err "Invalid --tool value: $TOOLS_CHOSEN (expected: codex|claude|both)"; exit 2 ;;
                esac
                shift ;;
            -k|--api-key)
                [ "$#" -ge 2 ] || { log_err "Missing value for $1"; exit 2; }
                API_KEY_GLOBAL="$2"
                shift 2 ;;
            --api-key=*)
                API_KEY_GLOBAL="${1#--api-key=}"
                shift ;;
            -y|--yes)
                ASSUME_YES=1
                shift ;;
            -h|--help)
                printf 'Usage: %s [--tool codex|claude|both] [--api-key KEY] [--yes]\n' "${0##*/}"
                exit 0 ;;
            *)
                log_err "Unknown argument: $1"
                printf 'Usage: %s [--tool codex|claude|both] [--api-key KEY] [--yes]\n' "${0##*/}" >&2
                exit 2 ;;
        esac
    done

    banner

    # ----- Menu: pick which tool(s) to install for -----
    if [ -z "$TOOLS_CHOSEN" ]; then
        prompt_choice 'Which tool do you want to configure?' \
            'Codex CLI only' \
            'Claude Code only' \
            'Both Codex and Claude Code' \
            'Cancel (do nothing)'

        case "$REPLY" in
            1) TOOLS_CHOSEN='codex' ;;
            2) TOOLS_CHOSEN='claude' ;;
            3) TOOLS_CHOSEN='both' ;;
            4)
                log_warn 'Cancelled by user'
                exit 0
                ;;
        esac
    else
        log_info "Tool preset via --tool: $TOOLS_CHOSEN"
    fi

    # ----- API key -----
    if [ -z "$API_KEY_GLOBAL" ]; then
        prompt_api_key
    else
        # Basic sanity check (non-empty, no whitespace); trust caller otherwise.
        API_KEY_GLOBAL="$(printf '%s' "$API_KEY_GLOBAL" | tr -d '[:space:]')"
        if [ -z "$API_KEY_GLOBAL" ]; then
            log_err "Provided --api-key is empty after stripping whitespace"
            exit 2
        fi
        log_info "API key supplied via --api-key (length=${#API_KEY_GLOBAL})"
    fi

    # ----- Run installs -----
    case "$TOOLS_CHOSEN" in
        codex)
            write_codex_config "$KANDES_BASE_URL" "$API_KEY_GLOBAL" || exit 1
            print_summary 'Codex CLI' "$API_KEY_GLOBAL"
            ;;
        claude)
            write_claude_config "$KANDES_BASE_URL" "$API_KEY_GLOBAL" || exit 1
            print_summary 'Claude Code' "$API_KEY_GLOBAL"
            ;;
        both)
            write_codex_config "$KANDES_BASE_URL" "$API_KEY_GLOBAL" || exit 1
            write_claude_config "$KANDES_BASE_URL" "$API_KEY_GLOBAL" || exit 1
            print_summary 'Codex CLI + Claude Code' "$API_KEY_GLOBAL"
            ;;
    esac
}

main "$@"