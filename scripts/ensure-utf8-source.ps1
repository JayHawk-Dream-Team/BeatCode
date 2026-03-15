$ErrorActionPreference = 'Stop'

$targetPatterns = @(
    'src/pages/problems/[pid].tsx'
)

$allFiles = New-Object System.Collections.Generic.HashSet[string]

foreach ($pattern in $targetPatterns) {
    try {
        $candidate = Get-ChildItem -LiteralPath $pattern -ErrorAction SilentlyContinue
        if ($null -ne $candidate) {
            [void]$allFiles.Add($candidate.FullName)
        }
    }
    catch {
        # keep going
    }
}

# Include all TS/TSX source files to keep everything consistent.
$allFilesFromTree = Get-ChildItem -Path src -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in '.ts', '.tsx' }
foreach ($f in $allFilesFromTree) {
    [void]$allFiles.Add($f.FullName)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false, $false)
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$legacy = [System.Text.Encoding]::GetEncoding([System.Globalization.CultureInfo]::InvariantCulture.TextInfo.ANSICodePage)

foreach ($full in $allFiles) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        if ($bytes.Length -eq 0) { continue }

        try {
            # Already UTF-8 compatible: normalize and remove BOM to keep encoding consistent.
            $text = $utf8Strict.GetString($bytes)
            [System.IO.File]::WriteAllText($full, $text, $utf8NoBom)
        }
        catch {
            # Legacy one-byte decode fallback -> normalize to UTF-8.
            $text = $legacy.GetString($bytes)
            [System.IO.File]::WriteAllText($full, $text, $utf8NoBom)
            Write-Host "Re-encoded ${full} to UTF-8"
        }
    }
    catch {
        Write-Warning ("Skipping ${full}: $($_.Exception.Message)")
    }
}
