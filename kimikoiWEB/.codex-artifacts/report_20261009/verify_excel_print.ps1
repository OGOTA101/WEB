$ErrorActionPreference = 'Stop'
$support = $PSScriptRoot
$spec = Get-Content -LiteralPath (Join-Path $support 'authored_values.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$excel = $null
$checks = @()

function Invoke-ExcelCall([scriptblock]$Call) {
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        try { return (& $Call) }
        catch {
            if ($attempt -eq 11 -or $_.Exception.ToString() -notmatch '80010001|8001010A|RPC_E_CALL_REJECTED') { throw }
            Start-Sleep -Milliseconds 500
        }
    }
}

try {
    $excel = New-Object -ComObject Excel.Application
    Write-Output 'Excel instance created; waiting for COM readiness'
    Invoke-ExcelCall { $excel.Visible = $false }
    Invoke-ExcelCall { $excel.DisplayAlerts = $false }
    Invoke-ExcelCall { $excel.AskToUpdateLinks = $false }
    Invoke-ExcelCall { $excel.AutomationSecurity = 3 }
    foreach ($item in @(
        @{ name = 'report'; path = $spec.outputPath },
        @{ name = 'template'; path = $spec.templatePath }
    )) {
        $book = $null
        $sheet = $null
        try {
            Write-Output ('Opening ' + $item.name + ' read-only')
            $book = Invoke-ExcelCall { $excel.Workbooks.Open([string]$item.path, 0, $true) }
            $sheet = Invoke-ExcelCall { $book.Worksheets.Item(1) }
            $pdf = Join-Path $support ($item.name + '_excel_print.pdf')
            Invoke-ExcelCall { $sheet.ExportAsFixedFormat(0, $pdf) }
            $cells = @()
            foreach ($row in @((8..15) + (19..22))) {
                $cell = $sheet.Range('G' + $row)
                $cells += [ordered]@{
                    address = 'G' + $row
                    text = [string]$cell.Value2
                    left = [double]$cell.Left
                    top = [double]$cell.Top
                    width = [double]$cell.Width
                    height = [double]$cell.Height
                    font = [string]$cell.Font.Name
                    fontSize = [double]$cell.Font.Size
                }
                [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
            }
            $checks += [ordered]@{
                name = $item.name
                workbook = $item.path
                pdf = $pdf
                readOnly = [bool]$book.ReadOnly
                printArea = [string]$sheet.PageSetup.PrintArea
                fitToWidth = $sheet.PageSetup.FitToPagesWide
                fitToHeight = $sheet.PageSetup.FitToPagesTall
                confirmationCells = $cells
            }
            Write-Output ($item.name + ': Excel opened read-only and exported print check')
        }
        finally {
            if ($sheet) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet) }
            if ($book) {
                Invoke-ExcelCall { $book.Close($false) }
                [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($book)
            }
        }
    }
    $checks | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $support 'excel_print_checks.json') -Encoding UTF8
}
finally {
    if ($excel) {
        try { Invoke-ExcelCall { $excel.Quit() } } catch { Write-Warning $_.Exception.Message }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
