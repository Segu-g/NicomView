export async function synthesize(
  text: string,
  speaker: number,
  speed: number,
  volume: number,
  host: string
): Promise<ArrayBuffer> {
  const queryRes = await fetch(
    `${host}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
    { method: 'POST' }
  )
  if (!queryRes.ok) {
    throw new Error(`audio_query failed: ${queryRes.status}`)
  }
  const query = await queryRes.json()

  query.speedScale = speed
  query.volumeScale = volume

  const synthRes = await fetch(
    `${host}/synthesis?speaker=${speaker}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    }
  )
  if (!synthRes.ok) {
    throw new Error(`synthesis failed: ${synthRes.status}`)
  }

  return synthRes.arrayBuffer()
}

export interface VoicevoxSpeaker {
  name: string
  styles: { id: number; name: string }[]
}

export async function fetchSpeakers(host: string): Promise<VoicevoxSpeaker[]> {
  const res = await fetch(`${host}/speakers`)
  if (!res.ok) {
    throw new Error(`speakers failed: ${res.status}`)
  }
  return res.json()
}
