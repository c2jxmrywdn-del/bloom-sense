Add-Type -AssemblyName Microsoft.VisualBasic
$paths = @(
  'C:\Users\35144\.qoderworkcn\workspace\mvgydy3cyhh37ls5\video_frames',
  'C:\Users\35144\.qoderworkcn\workspace\mvgydy3cyhh37ls5\ref2',
  'D:\blender-5.3.0-beta+v53.1878423c3717-windows.amd64-release\Blander-Deepseek\UE5-XR\public\demo'
)
foreach ($p in $paths) {
  if (Test-Path -LiteralPath $p -PathType Container) {
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p, 'OnlyErrorDialogs', 'SendToRecycleBin')
    Write-Output "Removed $p"
  } elseif (Test-Path -LiteralPath $p) {
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, 'OnlyErrorDialogs', 'SendToRecycleBin')
    Write-Output "Removed $p"
  }
}
