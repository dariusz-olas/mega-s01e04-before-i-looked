import type { DigestRow, NightDigest } from '../digest/types.js';

function ownerCell(owner: string | null) {
  return owner ?? '—';
}

function errorCell(error: string | null) {
  return error ?? '—';
}

function rowClass(row: DigestRow): string | undefined {
  if (row.lastStatus === 'fail' || row.retries >= 3) return 'warn';
  return undefined;
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  if (digest.rows.length === 0) {
    return (
      <>
        <h1>digest · {digest.night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }

  return (
    <>
      <h1>digest · {digest.night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last</th>
            <th>error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((row) => (
            <tr class={rowClass(row)}>
              <td>{row.job}</td>
              <td>{ownerCell(row.owner)}</td>
              <td>{row.runs}</td>
              <td>{row.retries}</td>
              <td>{row.lastStatus}</td>
              <td>{errorCell(row.lastError)}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {digest.badLines > 0 ? <p class="mute">bad lines: {digest.badLines}</p> : null}
    </>
  );
}
