# One-off: rasterise the app icons into public/ (needs Windows GDI+, no deps).
# Maskable = full-bleed brand square, glyph inside the 80% safe zone.
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path, [bool]$maskable) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'
  # light background token, then the brand tile — matches the app surface
  $bg = [System.Drawing.Color]::FromArgb(250, 247, 242)   # #faf7f2
  $brandA = [System.Drawing.Color]::FromArgb(19, 124, 113) # --brand
  $brandB = [System.Drawing.Color]::FromArgb(11, 98, 91)   # --brand-strong
  $g.Clear($bg)
  $pad = if ($maskable) { 0 } else { [math]::Round($size * 0.12) }
  $tile = [System.Drawing.RectangleF]::new($pad, $pad, $size - 2 * $pad, $size - 2 * $pad)
  $rect = [System.Drawing.RectangleF]::new($tile.X, $tile.Y, $tile.Width, $tile.Height)
  if ($maskable) {
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      [System.Drawing.PointF]::new(0, 0),
      [System.Drawing.PointF]::new($size, $size), $brandA, $brandB)
    $g.FillRectangle($brush, $rect)
  } else {
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $brandA, $brandB, 45)
    $d = [single]($size * 0.23)  # corner diameter of the app-icon squircle
    $rounded = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $rounded.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $rounded.AddArc($rect.X + $rect.Width - $d, $rect.Y, $d, $d, 270, 90)
    $rounded.AddArc($rect.X + $rect.Width - $d, $rect.Y + $rect.Height - $d, $d, $d, 0, 90)
    $rounded.AddArc($rect.X, $rect.Y + $rect.Height - $d, $d, $d, 90, 90)
    $rounded.CloseFigure()
    $g.FillPath($brush, $rounded)
  }
  # glyph in the safe zone (inner 80%) so a mask never clips it
  $fontSize = [single]($size * 0.42)
  $font = [System.Drawing.Font]::new('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = [System.Drawing.StringFormat]::new()
  $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $center = [System.Drawing.RectangleF]::new(0, [single](-$size * 0.01), [single]$size, [single]$size)
  $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $g.DrawString('P', $font, $textBrush, $center, $sf)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "wrote $path"
}

$out = Join-Path $PSScriptRoot '..\public'
New-Icon 512 (Join-Path $out 'icon-512.png') $true
New-Icon 192 (Join-Path $out 'icon-192.png') $false
New-Icon 180 (Join-Path $out 'apple-touch-icon.png') $false
