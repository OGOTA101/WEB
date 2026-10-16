$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectDir

python -m PyInstaller `
  --noconfirm `
  --clean `
  --onefile `
  --windowed `
  --collect-all tkinterdnd2 `
  --name ImageDropConverter `
  image_converter.py

$exe = Join-Path $projectDir "dist\ImageDropConverter.exe"
if (-not (Test-Path -LiteralPath $exe)) {
    throw "実行ファイルが生成されませんでした: $exe"
}

Write-Host "ビルド完了: $exe"
