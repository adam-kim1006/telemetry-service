param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$SharedSecret,

    [Parameter(Mandatory = $true)]
    [string]$OppId
)

$headers = @{
    'x-telemetry-secret' = $SharedSecret
}

function Get-LatestSession {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$OppId
    )

    $uri = "$BaseUrl/telemetry/opp/$OppId"
    $response = Invoke-RestMethod -Uri $uri -Headers $Headers -Method Get

    if (-not $response.sessions -or $response.sessions.Count -eq 0) {
        throw "No telemetry sessions found for oppId $OppId"
    }

    return $response.sessions[0]
}

function Get-SessionTimeline {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$SessionId
    )

    $uri = "$BaseUrl/telemetry/session/$SessionId"
    return Invoke-RestMethod -Uri $uri -Headers $Headers -Method Get
}

function Find-Event {
    param(
        [object[]]$Events,
        [string]$EventName
    )

    return $Events | Where-Object { $_.eventName -eq $EventName } | Select-Object -First 1
}

try {
    $latestSession = Get-LatestSession -BaseUrl $BaseUrl -Headers $headers -OppId $OppId
    $timeline = Get-SessionTimeline -BaseUrl $BaseUrl -Headers $headers -SessionId $latestSession.sessionId

    $pollStarted = Find-Event -Events $timeline.events -EventName 'decision_polling_started'
    $pollReady = Find-Event -Events $timeline.events -EventName 'decision_polling_ready'

    $result = [ordered]@{
        oppId = $OppId
        sessionId = $latestSession.sessionId
        startedAt = $latestSession.startedAt
        lastEventAt = $latestSession.lastEventAt
        decisionPollingStartedPresent = [bool]$pollStarted
        decisionPollingReadyPresent = [bool]$pollReady
        decisionPollingStartedTs = if ($pollStarted) { $pollStarted.eventTs } else { $null }
        decisionPollingReadyTs = if ($pollReady) { $pollReady.eventTs } else { $null }
        pollingWaitMs = $null
        phaseDurations = $timeline.phaseDurations
    }

    if ($pollStarted -and $pollReady) {
        $started = [DateTimeOffset]::Parse($pollStarted.eventTs)
        $ready = [DateTimeOffset]::Parse($pollReady.eventTs)
        $result.pollingWaitMs = [math]::Round(($ready - $started).TotalMilliseconds)
    }

    $result | ConvertTo-Json -Depth 8
} catch {
    Write-Error $_
    exit 1
}
