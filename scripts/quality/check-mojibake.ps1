param(
  [string[]]$Roots = @(
    "client/src",
    "server/src/main/java",
    "server/src/main/resources"
  )
)

$pattern = "\u00C3|\u00C2|\u00E2\u20AC|\uFFFD"
$extensions = @(
  ".ts", ".tsx", ".js", ".jsx", ".json", ".css",
  ".java", ".sql", ".yml", ".yaml", ".properties", ".xml"
)

$matches = @()

foreach ($root in $Roots) {
  if (-not (Test-Path $root)) {
    continue
  }

  $files = Get-ChildItem -Path $root -Recurse -File | Where-Object {
    $extensions -contains $_.Extension.ToLowerInvariant()
  }

  foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    if ([regex]::IsMatch($content, $pattern)) {
      $lines = $content -split "`r?`n"
      $lineHits = @()

      for ($i = 0; $i -lt $lines.Length; $i++) {
        if ([regex]::IsMatch($lines[$i], $pattern)) {
          $lineHits += "$($i + 1): $($lines[$i].Trim())"
        }

        if ($lineHits.Count -ge 3) {
          break
        }
      }

      $matches += [PSCustomObject]@{
        File  = $file.FullName
        Lines = $lineHits
      }
    }
  }
}

if ($matches.Count -gt 0) {
  Write-Host "Mojibake detecte dans les fichiers suivants:" -ForegroundColor Red
  foreach ($entry in $matches) {
    Write-Host "- $($entry.File)" -ForegroundColor Yellow
    foreach ($line in $entry.Lines) {
      Write-Host "    $line" -ForegroundColor DarkYellow
    }
  }
  exit 1
}

Write-Host "OK: aucun motif de mojibake detecte dans les sources scannees." -ForegroundColor Green
exit 0
