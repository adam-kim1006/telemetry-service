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

$expectedEvents = @(
    'decision_polling_started',
    'plaid_webhook_received',
    'de_started',
    'de_finished',
    'decision_polling_ready',
    'applicationcomplete_dispatched',
    'loan_offer_rendered'
)

function Get-LatestSession {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$OppId
    )

    $response = Invoke-RestMethod -Uri "$BaseUrl/telemetry/opp/$OppId" -Headers $Headers -Method Get

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

    return Invoke-RestMethod -Uri "$BaseUrl/telemetry/session/$SessionId" -Headers $Headers -Method Get
}

function Find-Event {
    param(
        [object[]]$Events,
        [string]$EventName
    )

    return $Events | Where-Object { $_.eventName -eq $EventName } | Select-Object -First 1
}

function New-Duration {
    param(
        [object]$StartEvent,
        [object]$EndEvent
    )

    if (-not $StartEvent -or -not $EndEvent) {
        return $null
    }

    $started = [DateTimeOffset]::Parse($StartEvent.eventTs)
    $ended = [DateTimeOffset]::Parse($EndEvent.eventTs)

    return [math]::Round(($ended - $started).TotalMilliseconds)
}

try {
    $latestSession = Get-LatestSession -BaseUrl $BaseUrl -Headers $headers -OppId $OppId
    $timeline = Get-SessionTimeline -BaseUrl $BaseUrl -Headers $headers -SessionId $latestSession.sessionId

    $eventSummary = [ordered]@{}
    foreach ($eventName in $expectedEvents) {
        $match = Find-Event -Events $timeline.events -EventName $eventName
        $eventSummary[$eventName] = [ordered]@{
            present = [bool]$match
            eventTs = if ($match) { $match.eventTs } else { $null }
            payload = if ($match) { $match.payload } else { $null }
        }
    }

    $durations = [ordered]@{
        pollingWaitMs = New-Duration -StartEvent (Find-Event $timeline.events 'decision_polling_started') -EndEvent (Find-Event $timeline.events 'decision_polling_ready')
        readyToApplicationCompleteMs = New-Duration -StartEvent (Find-Event $timeline.events 'decision_polling_ready') -EndEvent (Find-Event $timeline.events 'applicationcomplete_dispatched')
        applicationCompleteToRenderMs = New-Duration -StartEvent (Find-Event $timeline.events 'applicationcomplete_dispatched') -EndEvent (Find-Event $timeline.events 'loan_offer_rendered')
        webhookToDeStartMs = New-Duration -StartEvent (Find-Event $timeline.events 'plaid_webhook_received') -EndEvent (Find-Event $timeline.events 'de_started')
        deExecutionMs = New-Duration -StartEvent (Find-Event $timeline.events 'de_started') -EndEvent (Find-Event $timeline.events 'de_finished')
    }

    [ordered]@{
        oppId = $OppId
        sessionId = $latestSession.sessionId
        startedAt = $latestSession.startedAt
        lastEventAt = $latestSession.lastEventAt
        finalStatus = $latestSession.finalStatus
        events = $eventSummary
        durations = $durations
        phaseDurations = $timeline.phaseDurations
    } | ConvertTo-Json -Depth 10
} catch {
    Write-Error $_
    exit 1
}
