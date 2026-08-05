param (
    [int]$Port = 8080
)

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Server running at http://localhost:$Port/"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, x-api-key")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $localPath = $request.Url.LocalPath

        if ($localPath -eq "/api/info") {
            $id = $request.QueryString["id"]
            $apiKey = $request.Headers["x-api-key"]

            if ([string]::IsNullOrWhiteSpace($id)) {
                $response.StatusCode = 400
                $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing id"}')
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            try {
                $targetUrl = "https://cuyr21hbxd.execute-api.ap-northeast-2.amazonaws.com/prod/61258/moment-creative-info?id=$id"
                $webReq = [System.Net.WebRequest]::Create($targetUrl)
                $webReq.Method = "GET"
                if (-not [string]::IsNullOrWhiteSpace($apiKey)) {
                    $webReq.Headers.Add("x-api-key", $apiKey)
                }

                $webResp = $webReq.GetResponse()
                $reader = New-Object System.IO.StreamReader($webResp.GetResponseStream())
                $rawResult = $reader.ReadToEnd()

                $response.ContentType = "application/json; charset=utf-8"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($rawResult)
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } catch [System.Net.WebException] {
                $exResp = $_.Exception.Response
                if ($exResp) {
                    $response.StatusCode = [int]$exResp.StatusCode
                    $reader = New-Object System.IO.StreamReader($exResp.GetResponseStream())
                    $errResult = $reader.ReadToEnd()
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errResult)
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } else {
                    $response.StatusCode = 500
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Proxy Error"}')
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
            } finally {
                $response.Close()
            }
            continue
        }

        $filePath = Join-Path $PSScriptRoot ($localPath.TrimStart('/'))
        if (-not (Test-Path $filePath) -or (Test-Path $filePath -PathType Container)) {
            $filePath = Join-Path $PSScriptRoot "index.html"
        }

        if (Test-Path $filePath) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            if ($ext -eq ".html") {
                $response.ContentType = "text/html; charset=utf-8"
            } elseif ($ext -eq ".css") {
                $response.ContentType = "text/css; charset=utf-8"
            } elseif ($ext -eq ".js") {
                $response.ContentType = "application/javascript; charset=utf-8"
            } else {
                $response.ContentType = "application/octet-stream"
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
