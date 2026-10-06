# Ekspor Guidebook .pptx ke PDF yang tampilannya sama persis dengan PowerPoint.
#
#   powershell -File docs/guidebook/export-pdf.ps1
#
# Butuh: Microsoft PowerPoint, Python dengan pymupdf (pip install pymupdf).
param(
  [string]$Pptx = (Join-Path $PSScriptRoot 'Guidebook-DN-Administration-System.pptx'),
  [string]$Pdf = (Join-Path $PSScriptRoot 'Guidebook-DN-Administration-System.pdf')
)
$kerja = Join-Path $env:TEMP ('guidebook-pdf-' + [guid]::NewGuid())
$png = Join-Path $kerja 'png'
New-Item -ItemType Directory -Force $png | Out-Null
$native = Join-Path $kerja 'native.pdf'

# PowerPoint COM berbagi satu instance dengan jendela pengguna: jangan Quit()
# bila PowerPoint sudah berjalan sebelum script ini.
$sudahJalan = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open((Resolve-Path $Pptx).Path, -1, 0, 0)  # ReadOnly, tanpa jendela
  $pres.SaveCopyAs($native, 32)                                         # 32 = ppSaveAsPDF
  $i = 1
  foreach ($s in $pres.Slides) { $s.Export((Join-Path $png ('slide-{0:D2}.png' -f $i)), 'PNG', 3200, 1800); $i++ }
  $pres.Close()
} finally {
  if (-not $sudahJalan) { $app.Quit() }
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
}

python (Join-Path $PSScriptRoot 'gabung-pdf.py') $native $png $Pdf
if ($?) { Remove-Item -Recurse -Force $kerja }
