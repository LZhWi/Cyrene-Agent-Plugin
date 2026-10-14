$ErrorActionPreference = 'Stop'
$nativeRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$framework = Split-Path -Parent $compiler
$metadata = 'C:\Windows\System32\WinMetadata'
$refs = @('System.Runtime','System.Runtime.InteropServices.WindowsRuntime','System.Runtime.WindowsRuntime','System.Numerics','System.Numerics.Vectors','System.Drawing','System.Windows.Forms') | ForEach-Object { '/r:' + (Join-Path $framework ($_ + '.dll')) }
$refs += Get-ChildItem -LiteralPath $metadata -Filter '*.winmd' | ForEach-Object { '/r:' + $_.FullName }
& $compiler /nologo /target:exe /platform:x64 ('/out:' + (Join-Path $nativeRoot 'GlassHost.exe')) @refs (Join-Path $nativeRoot 'native/GlassHost.cs')
if ($LASTEXITCODE -ne 0) { throw 'GlassHost compilation failed' }
& $compiler /nologo /target:exe ('/out:' + (Join-Path $nativeRoot 'AsusSensors.exe')) (Join-Path $nativeRoot 'native/AsusSensors.cs')
if ($LASTEXITCODE -ne 0) { throw 'AsusSensors compilation failed' }
Get-FileHash -LiteralPath (Join-Path $nativeRoot 'GlassHost.exe'), (Join-Path $nativeRoot 'AsusSensors.exe') -Algorithm SHA256
