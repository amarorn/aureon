# Google Meet no Calendar + Zoom + meetingUrl na proposta

## Google Meet (conferenceData)

- Ao **criar** evento no Calendar (sem `googleEventId`), o `GoogleCalendarService.syncEvent` pode enviar:
  - `conferenceData.createRequest` com `conferenceSolutionKey.type: hangoutsMeet`
  - Query `conferenceDataVersion=1` no POST
- Resposta traz `hangoutLink` ou `conferenceData.entryPoints[].uri` → gravado em `appointments.meeting_url`.
- **CreateAppointmentDto**: `addGoogleMeet` (default `true` para `type: meeting`). `false` desliga Meet.
- **Update** de evento existente não adiciona Meet automaticamente (`addGoogleMeet: false` no update).

## Zoom

- **Provider** `zoom` no enum; OAuth Zoom (`INTEGRATION_ZOOM_CLIENT_ID` / `SECRET`), redirect igual aos demais.
- **POST** `/integrations/zoom/meetings` — body `topic`, `startAt`, `endAt`, `agenda?` → retorna `join_url`.
- **CreateAppointmentDto**: `useZoomMeeting: true` — antes do sync Google, cria reunião Zoom e preenche `location` + `meetingUrl` com `join_url`; Meet não é criado no mesmo evento (evita dois links).

## Proposta

- Entidade **Proposal** com coluna `meeting_url`.
- **CreateProposalDto** / create / duplicate suportam `meetingUrl`.
- Preencher ao agendar (copiar do appointment) ou manualmente na API.

## Banco

Novas colunas nullable:

- `appointments.meeting_url`
- `proposals.meeting_url`

Se o TypeORM não alterar automaticamente, SQL manual conforme seu schema.

## Frontend

- Integrações: card **Zoom** OAuth.
- Calendário: enviar `addGoogleMeet` / `useZoomMeeting` no POST conforme toggles (a implementar na UI se ainda não existir).
