param(
  [Parameter(Mandatory = $true)]
  [string]$DocxPath,

  [string]$OutputDir = (Join-Path (Get-Location) "tts-output"),
  [string]$Model = "openai/gpt-4o-mini-tts-2025-12-15",
  [string]$Voice = "nova",
  [double]$Speed = 0.8,
  [int]$MaxChunkChars = 2600
)

$ErrorActionPreference = "Stop"

if (-not $env:OPENROUTER_API_KEY) {
  throw "OPENROUTER_API_KEY is not set."
}

$resolvedDocx = (Resolve-Path -LiteralPath $DocxPath).Path
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$resolvedOut = (Resolve-Path -LiteralPath $OutputDir).Path

function Get-DocxParagraphs {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $zip.GetEntry("word/document.xml")
    if (-not $entry) { throw "word/document.xml was not found in the DOCX." }

    $reader = New-Object System.IO.StreamReader($entry.Open())
    $xmlText = $reader.ReadToEnd()
    $reader.Close()

    [xml]$xml = $xmlText
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $paragraphs = New-Object System.Collections.Generic.List[string]
    foreach ($p in $xml.SelectNodes("//w:body/w:p", $ns)) {
      $parts = New-Object System.Collections.Generic.List[string]
      foreach ($node in $p.SelectNodes(".//w:t|.//w:tab|.//w:br", $ns)) {
        if ($node.LocalName -eq "t") {
          $parts.Add($node.InnerText)
        } elseif ($node.LocalName -eq "tab") {
          $parts.Add(" ")
        } elseif ($node.LocalName -eq "br") {
          $parts.Add(" ")
        }
      }

      $text = [string]::Join("", $parts)
      $text = [regex]::Replace($text, "\s+", " ").Trim()
      if ($text.Length -gt 0) {
        $paragraphs.Add($text)
      }
    }

    return $paragraphs
  }
  finally {
    $zip.Dispose()
  }
}

function Split-ParagraphsForTts {
  param(
    [string[]]$Paragraphs,
    [int]$MaxChars
  )

  $chunks = New-Object System.Collections.Generic.List[string]
  $current = ""

  foreach ($paragraph in $Paragraphs) {
    if ($paragraph.Length -gt $MaxChars) {
      if ($current.Length -gt 0) {
        $chunks.Add($current.Trim())
        $current = ""
      }

      $sentences = [regex]::Split($paragraph, "(?<=[.!?؟])\s+")
      foreach ($sentence in $sentences) {
        $sentence = $sentence.Trim()
        if ($sentence.Length -eq 0) { continue }

        if ($sentence.Length -gt $MaxChars) {
          $words = $sentence -split "\s+"
          $piece = ""
          foreach ($word in $words) {
            $candidate = if ($piece.Length -eq 0) { $word } else { "$piece $word" }
            if ($candidate.Length -gt $MaxChars -and $piece.Length -gt 0) {
              $chunks.Add($piece.Trim())
              $piece = $word
            } else {
              $piece = $candidate
            }
          }
          if ($piece.Length -gt 0) { $chunks.Add($piece.Trim()) }
          continue
        }

        $candidate = if ($current.Length -eq 0) { $sentence } else { "$current $sentence" }
        if ($candidate.Length -gt $MaxChars -and $current.Length -gt 0) {
          $chunks.Add($current.Trim())
          $current = $sentence
        } else {
          $current = $candidate
        }
      }

      continue
    }

    $candidate = if ($current.Length -eq 0) { $paragraph } else { "$current`r`n`r`n$paragraph" }
    if ($candidate.Length -gt $MaxChars -and $current.Length -gt 0) {
      $chunks.Add($current.Trim())
      $current = $paragraph
    } else {
      $current = $candidate
    }
  }

  if ($current.Length -gt 0) {
    $chunks.Add($current.Trim())
  }

  return $chunks
}

$paragraphs = Get-DocxParagraphs -Path $resolvedDocx
$fullText = [string]::Join("`r`n`r`n", $paragraphs)
$chunks = Split-ParagraphsForTts -Paragraphs $paragraphs -MaxChars $MaxChunkChars

$fullTextPath = Join-Path $resolvedOut "source-text.txt"
Set-Content -LiteralPath $fullTextPath -Value $fullText -Encoding UTF8

$chunkDir = Join-Path $resolvedOut "chunks"
New-Item -ItemType Directory -Force -Path $chunkDir | Out-Null

for ($i = 0; $i -lt $chunks.Count; $i++) {
  $chunkPath = Join-Path $chunkDir ("chunk-{0:D3}.txt" -f ($i + 1))
  Set-Content -LiteralPath $chunkPath -Value $chunks[$i] -Encoding UTF8
}

Write-Host ("Extracted {0} paragraphs into {1} TTS chunks." -f $paragraphs.Count, $chunks.Count)
Write-Host ("Characters: {0}" -f $fullText.Length)

$audioDir = Join-Path $resolvedOut "audio-parts"
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$headers = @{
  Authorization = "Bearer $env:OPENROUTER_API_KEY"
  "Content-Type" = "application/json"
  "HTTP-Referer" = "https://localhost"
  "X-Title" = "DOCX to TTS"
}

for ($i = 0; $i -lt $chunks.Count; $i++) {
  $partNumber = $i + 1
  $partPath = Join-Path $audioDir ("part-{0:D3}.mp3" -f $partNumber)
  if ((Test-Path -LiteralPath $partPath) -and ((Get-Item -LiteralPath $partPath).Length -gt 1024)) {
    Write-Host ("Part {0}/{1} already exists, skipping." -f $partNumber, $chunks.Count)
    continue
  }

  $body = @{
    model = $Model
    input = $chunks[$i]
    voice = $Voice
    response_format = "mp3"
    speed = $Speed
    provider = @{
      options = @{
        openai = @{
          instructions = "Read the provided text exactly as written. Do not summarize, rewrite, omit, skip, or add words. Use a realistic, clear, steady educational narration voice with natural pauses after questions and headings."
        }
      }
    }
  } | ConvertTo-Json -Depth 10

  Write-Host ("Generating part {0}/{1} ({2} chars)..." -f $partNumber, $chunks.Count, $chunks[$i].Length)

  $tempPath = "$partPath.tmp"
  try {
    Invoke-WebRequest `
      -Uri "https://openrouter.ai/api/v1/audio/speech" `
      -Method Post `
      -Headers $headers `
      -Body $body `
      -OutFile $tempPath `
      -TimeoutSec 300

    if (-not (Test-Path -LiteralPath $tempPath) -or ((Get-Item -LiteralPath $tempPath).Length -lt 1024)) {
      throw "OpenRouter returned an empty or tiny audio file for part $partNumber."
    }

    Move-Item -LiteralPath $tempPath -Destination $partPath -Force
  }
  catch {
    if (Test-Path -LiteralPath $tempPath) {
      $maybeText = Get-Content -LiteralPath $tempPath -Raw -ErrorAction SilentlyContinue
      if ($maybeText) { Write-Host $maybeText }
      Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
    }
    throw
  }
}

$concatList = Join-Path $resolvedOut "concat-list.txt"
$concatLines = Get-ChildItem -LiteralPath $audioDir -Filter "part-*.mp3" |
  Sort-Object Name |
  ForEach-Object { "file '$($_.FullName.Replace("'", "''"))'" }
Set-Content -LiteralPath $concatList -Value $concatLines -Encoding ASCII

$joinedPath = Join-Path $resolvedOut "converted-to-audio-openrouter-tts.mp3"
& ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $concatList -c copy $joinedPath
if ($LASTEXITCODE -ne 0) { throw "ffmpeg concat failed." }

$duration = & ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 $joinedPath
$sizeMb = [math]::Round((Get-Item -LiteralPath $joinedPath).Length / 1MB, 2)

Write-Host ""
Write-Host "Done."
Write-Host ("Output: {0}" -f $joinedPath)
Write-Host ("Duration seconds: {0}" -f $duration)
Write-Host ("Size MB: {0}" -f $sizeMb)
