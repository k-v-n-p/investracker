# postToolUse hook: nudge agent to sync README after app or skill edits
$ErrorActionPreference = 'Stop'

$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

try {
    $input = $raw | ConvertFrom-Json
} catch {
    exit 0
}

$toolName = $input.tool_name
if ($toolName -notin @('Write', 'StrReplace', 'ApplyPatch', 'EditNotebook')) { exit 0 }

# Resolve edited path from common tool input shapes
$path = $input.tool_input.path
if (-not $path) { $path = $input.tool_input.file_path }
if (-not $path) { $path = $input.tool_input.target_notebook }
if (-not $path) { exit 0 }

$normalized = ($path -replace '\\', '/').ToLowerInvariant()

# Skip README itself to avoid feedback loops
if ($normalized -match 'readme\.md$') { exit 0 }

$isAppFile = $normalized -match '(^|/)(index\.html$|css/|js/)'
$isDomainSkill = $normalized -match '/\.cursor/skills/(stock-portfolio-tracking|property-investment-tracking)/'

if (-not $isAppFile -and -not $isDomainSkill) { exit 0 }

$trigger = if ($isAppFile) { 'an app file (index.html, css/, or js/)' } else { 'a domain skill' }

$context = @"
README sync required: $trigger was just edited ($([System.IO.Path]::GetFileName($path))).

Before finishing this task:
1. Read the update-readme skill (.cursor/skills/update-readme/SKILL.md)
2. Scan index.html, css/, and js/ for any UI/logic changes
3. Rewrite README.md — compact, table-first, <=180 lines target
4. Use template.md in the same skill folder as the skeleton

Skip only if the user explicitly said not to update docs.
"@

@{ additional_context = $context } | ConvertTo-Json -Compress
exit 0
