Add-Type -AssemblyName Microsoft.VisualBasic
$p = 'D:\blender-5.3.0-beta+v53.1878423c3717-windows.amd64-release\Blander-Deepseek\UE5-XR\public\demo\reference.webm'
if (Test-Path -LiteralPath $p) {
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, 'OnlyErrorDialogs', 'SendToRecycleBin')
    Write-Output 'Moved demo video to Recycle Bin'
} else {
    Write-Output 'Demo video not found'
}
Start-Sleep -Milliseconds 300
if (Test-Path -LiteralPath $p) { Write-Output 'STILL_PRESENT' } else { Write-Output 'CONFIRMED_REMOVED' }
