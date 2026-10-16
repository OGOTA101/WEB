Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$outDir = Join-Path $root "public\assets"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$frame = 32
$cols = 16
$rows = 10
$width = $cols * $frame
$height = $rows * $frame
$bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

function New-Color([int]$rgb, [int]$alpha = 255) {
  return [System.Drawing.Color]::FromArgb($alpha, ($rgb -shr 16) -band 255, ($rgb -shr 8) -band 255, $rgb -band 255)
}

function New-Brush([int]$rgb, [int]$alpha = 255) {
  return New-Object System.Drawing.SolidBrush (New-Color $rgb $alpha)
}

function Frame-Origin([int]$index) {
  return @{ X = ($index % $script:cols) * $script:frame; Y = [Math]::Floor($index / $script:cols) * $script:frame }
}

function Fill-Rect([int]$index, [int]$x, [int]$y, [int]$w, [int]$h, [int]$rgb, [int]$alpha = 255) {
  $origin = Frame-Origin $index
  $brush = New-Brush $rgb $alpha
  $script:graphics.FillRectangle($brush, $origin.X + $x, $origin.Y + $y, $w, $h)
  $brush.Dispose()
}

function Fill-Poly([int]$index, [int[]]$coords, [int]$rgb, [int]$alpha = 255) {
  $origin = Frame-Origin $index
  $points = @()
  for ($i = 0; $i -lt $coords.Length; $i += 2) {
    $points += New-Object System.Drawing.Point ($origin.X + $coords[$i]), ($origin.Y + $coords[$i + 1])
  }
  $brush = New-Brush $rgb $alpha
  $script:graphics.FillPolygon($brush, [System.Drawing.Point[]]$points)
  $brush.Dispose()
}

function Draw-Block([int]$index, [hashtable]$c, [bool]$core) {
  Fill-Rect $index 3 4 27 27 0x050608 80
  Fill-Rect $index 1 1 30 30 $c.edge
  Fill-Rect $index 4 4 24 24 $c.color
  Fill-Rect $index 5 5 22 3 $c.light 115
  Fill-Rect $index 5 5 3 22 $c.light 90
  Fill-Rect $index 5 24 22 3 $c.dark 115
  Fill-Rect $index 24 5 3 22 $c.dark 100

  if ($c.name -eq "wood") {
    9, 16, 23 | ForEach-Object { Fill-Rect $index 7 $_ 18 2 $c.dark 135 }
    Fill-Rect $index 12 7 2 19 $c.light 70
  } elseif ($c.name -eq "brick") {
    Fill-Rect $index 5 14 22 2 $c.dark 130
    Fill-Rect $index 15 5 2 9 $c.dark 130
    Fill-Rect $index 10 16 2 10 $c.dark 130
    Fill-Rect $index 21 16 2 10 $c.dark 130
  } elseif ($c.name -eq "stone") {
    Fill-Rect $index 8 8 5 4 $c.dark 110
    Fill-Rect $index 18 12 6 5 $c.dark 105
    Fill-Rect $index 12 22 8 3 $c.light 95
  } elseif ($c.name -eq "iron") {
    Fill-Rect $index 7 8 18 3 $c.light 125
    Fill-Rect $index 7 21 18 3 $c.dark 115
    Fill-Rect $index 11 12 10 8 0xffffff 35
  } elseif ($c.name -eq "diamond") {
    Fill-Poly $index @(16,6,25,16,16,26,7,16) $c.dark 90
    Fill-Poly $index @(16,8,23,16,16,24,9,16) $c.light 155
    Fill-Rect $index 14 12 4 8 0xffffff 75
  } else {
    Fill-Rect $index 7 7 6 6 $c.light 95
    Fill-Rect $index 19 18 6 6 $c.light 90
    Fill-Rect $index 13 13 6 6 $c.dark 145
  }

  if ($core) {
    Fill-Rect $index 8 8 16 16 0x061018 170
    Fill-Rect $index 10 10 12 12 $c.core
    Fill-Rect $index 14 14 4 4 0xffffff 180
    Fill-Rect $index 7 14 3 4 $c.core 220
    Fill-Rect $index 22 14 3 4 $c.core 220
  }
}

$materials = @(
  @{ name = "wood"; color = 0x9a6a39; edge = 0x5f351b; light = 0xc18a50; dark = 0x6f4524; core = 0xffd166 },
  @{ name = "brick"; color = 0xb14f3c; edge = 0x6f2c29; light = 0xd07156; dark = 0x743027; core = 0xff7b54 },
  @{ name = "stone"; color = 0x8a9092; edge = 0x52585d; light = 0xb4bbbf; dark = 0x5d666c; core = 0xdce6ec },
  @{ name = "iron"; color = 0xc9d2d8; edge = 0x707b84; light = 0xf3f7fb; dark = 0x87939c; core = 0x70d6ff },
  @{ name = "diamond"; color = 0x42d5f5; edge = 0x157c99; light = 0xe0fbff; dark = 0x1382a0; core = 0x00f5d4 },
  @{ name = "obsidian"; color = 0x2b2142; edge = 0x0c0814; light = 0x5b3a88; dark = 0x11081f; core = 0xbdb2ff }
)

for ($i = 0; $i -lt $materials.Count; $i += 1) {
  Draw-Block $i $materials[$i] $false
  Draw-Block ($i + 6) $materials[$i] $true
}

$palette = @(0xffd166, 0x70d6ff, 0x80ed99, 0xf78c6b, 0xbdb2ff, 0xffafcc, 0xf3722c, 0x00f5d4, 0xffffff, 0xf94144, 0x9b5de5, 0xfee440, 0x4cc9f0, 0x95d5b2, 0xff6b6b, 0xe0aaff)

for ($i = 0; $i -lt 144; $i += 1) {
  $frameIndex = 16 + $i
  $color = $palette[$i % $palette.Count]
  $style = $i % 12
  Fill-Rect $frameIndex 7 8 18 18 0x000000 70
  if ($style -eq 0) {
    Fill-Rect $frameIndex 10 10 12 12 0x061018
    Fill-Rect $frameIndex 12 12 8 8 $color
    Fill-Rect $frameIndex 14 14 3 3 0xffffff 140
  } elseif ($style -eq 1) {
    Fill-Poly $frameIndex @(16,5,26,16,16,27,6,16) 0x061018
    Fill-Poly $frameIndex @(16,8,23,16,16,24,9,16) $color
    Fill-Rect $frameIndex 15 13 2 7 0xffffff 130
  } elseif ($style -eq 2) {
    Fill-Poly $frameIndex @(24,16,8,7,11,16,8,25) 0x061018
    Fill-Poly $frameIndex @(22,16,10,10,13,16,10,22) $color
    Fill-Rect $frameIndex 6 14 5 4 0xfff3b0
  } elseif ($style -eq 3) {
    Fill-Rect $frameIndex 6 13 20 6 0x061018
    Fill-Rect $frameIndex 7 15 19 2 $color
    Fill-Rect $frameIndex 20 12 5 8 0xffffff 90
  } elseif ($style -eq 4) {
    Fill-Rect $frameIndex 8 8 16 16 0x061018
    Fill-Rect $frameIndex 10 10 12 12 $color
    Fill-Rect $frameIndex 13 13 6 6 0x220000 120
  } elseif ($style -eq 5) {
    Fill-Rect $frameIndex 8 13 16 6 0x061018
    Fill-Rect $frameIndex 13 8 6 16 0x061018
    Fill-Rect $frameIndex 10 15 12 2 $color
    Fill-Rect $frameIndex 15 10 2 12 $color
  } elseif ($style -eq 6) {
    Fill-Rect $frameIndex 9 9 14 14 0x061018
    Fill-Rect $frameIndex 11 11 10 10 $color 220
    Fill-Rect $frameIndex 14 14 4 4 0xffffff 160
  } elseif ($style -eq 7) {
    Fill-Poly $frameIndex @(16,6,22,13,26,16,22,19,16,26,10,19,6,16,10,13) 0x061018
    Fill-Poly $frameIndex @(16,9,21,14,23,16,21,18,16,23,11,18,9,16,11,14) $color
  } elseif ($style -eq 8) {
    Fill-Rect $frameIndex 8 8 16 4 $color
    Fill-Rect $frameIndex 20 8 4 16 $color
    Fill-Rect $frameIndex 8 20 16 4 $color
    Fill-Rect $frameIndex 8 8 4 16 $color
    Fill-Rect $frameIndex 12 12 8 8 0x061018
  } elseif ($style -eq 9) {
    Fill-Rect $frameIndex 11 5 10 22 0x061018
    Fill-Rect $frameIndex 14 7 4 18 $color
    Fill-Rect $frameIndex 9 12 14 4 $color 150
  } elseif ($style -eq 10) {
    Fill-Rect $frameIndex 8 17 16 7 0x061018
    Fill-Rect $frameIndex 10 15 12 7 $color
    Fill-Rect $frameIndex 14 9 4 7 0xfff3b0
  } else {
    Fill-Rect $frameIndex 7 15 18 3 $color
    Fill-Rect $frameIndex 14 8 4 17 $color
    Fill-Rect $frameIndex 11 11 10 10 0x061018 170
    Fill-Rect $frameIndex 14 14 4 4 $color
  }
}

$outPath = Join-Path $outDir "game-sprites.png"
$bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Generated $outPath"
