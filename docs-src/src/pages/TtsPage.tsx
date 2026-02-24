import { Layout } from '../components/Layout'
import ttsSettingsImg from '/img/screenshots/tts-settings.png'

export function TtsPage() {
  return (
    <Layout title="読み上げ (TTS)">
      <h1>読み上げ (TTS)</h1>

      <section>
        <h2>概要</h2>
        <p>
          コメントやギフトなどのイベントを音声で読み上げる機能です。設定 UI
          の「読み上げ設定」セクションで有効化・設定できます。
        </p>
        <img
          src={ttsSettingsImg}
          alt="TTS 設定画面"
          className="screenshot"
        />
      </section>

      <section>
        <h2>対応エンジン</h2>
        <table>
          <thead>
            <tr><th>エンジン</th><th>接続先</th><th>備考</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>VOICEVOX</td>
              <td><code>http://localhost:50021</code></td>
              <td>キャラクター選択・イベント別キャラ上書き対応</td>
            </tr>
            <tr>
              <td>棒読みちゃん</td>
              <td><code>http://localhost:50080</code></td>
              <td>RemoteTalk HTTP API 経由</td>
            </tr>
          </tbody>
        </table>
        <div className="note">
          <strong>注意:</strong> TTS
          を使用するには、対応エンジンが起動している必要があります。VOICEVOX は{' '}
          <a href="https://voicevox.hiroshiba.jp/">公式サイト</a>{' '}
          からダウンロードできます。
        </div>
      </section>

      <section>
        <h2>設定手順</h2>
        <ol className="steps">
          <li>
            <strong>読み上げを有効化</strong>
            <br />
            設定 UI
            の「読み上げ設定」セクションを展開し、「読み上げを有効にする」をオンにします。
          </li>
          <li>
            <strong>エンジンを選択</strong>
            <br />
            「読み上げエンジン」ドロップダウンから使用するエンジンを選択します。
          </li>
          <li>
            <strong>エンジン固有の設定</strong>
            <br />
            VOICEVOX
            の場合はキャラクターを選択します。エンジンに応じたパラメータが動的に表示されます。
          </li>
          <li>
            <strong>読み上げ対象を選択</strong>
            <br />
            読み上げるイベント種別（コメント・ギフトなど）のチェックボックスを設定します。
          </li>
        </ol>
      </section>

      <section>
        <h2>設定項目</h2>

        <h3>エンジン設定</h3>
        <p>
          読み上げエンジンの選択と、エンジン固有パラメータ（キャラクターなど）を設定します。
        </p>

        <h3>イベント設定</h3>
        <p>
          読み上げ対象イベントの選択、テンプレート編集、イベント別キャラクター上書きを設定します。
        </p>

        <h3>音声調整</h3>
        <table>
          <thead>
            <tr><th>項目</th><th>範囲</th><th>デフォルト</th></tr>
          </thead>
          <tbody>
            <tr><td>速度</td><td>0.5 〜 2.0</td><td>1.0</td></tr>
            <tr><td>音量</td><td>0 〜 2.0</td><td>1.0</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>テンプレートとプレースホルダー</h2>
        <p>
          各イベントの読み上げテキストをテンプレートでカスタマイズできます。
          <code>{'{}'}</code>{' '}
          で囲んだプレースホルダーが実際の値に置換されます。
        </p>

        <table>
          <thead>
            <tr>
              <th>イベント</th>
              <th>デフォルトテンプレート</th>
              <th>使用可能なプレースホルダー</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>コメント</td>
              <td><code>{'{content}'}</code></td>
              <td><code>{'{content}'}</code>, <code>{'{userName}'}</code></td>
            </tr>
            <tr>
              <td>ギフト</td>
              <td><code>{'{userName}さんが{itemName}を贈りました'}</code></td>
              <td><code>{'{userName}'}</code>, <code>{'{itemName}'}</code>, <code>{'{itemCount}'}</code>, <code>{'{content}'}</code></td>
            </tr>
            <tr>
              <td>エモーション</td>
              <td><code>{'{content}'}</code></td>
              <td><code>{'{content}'}</code></td>
            </tr>
            <tr>
              <td>通知</td>
              <td><code>{'{message}'}</code></td>
              <td><code>{'{message}'}</code></td>
            </tr>
            <tr>
              <td>運営コメント</td>
              <td><code>{'運営コメント: {content}'}</code></td>
              <td><code>{'{content}'}</code>, <code>{'{userName}'}</code></td>
            </tr>
          </tbody>
        </table>

        <h3>テンプレート例</h3>
        <pre>
          <code>{`# コメントにユーザー名を含める
{userName}さん: {content}

# ギフトのカスタムメッセージ
{userName}さんから{itemName}が{itemCount}個届きました！`}</code>
        </pre>
      </section>

      <section>
        <h2>イベント別キャラクター上書き</h2>
        <p>
          VOICEVOX
          では、イベント種別ごとに異なるキャラクター（スピーカー）を指定できます。例えば:
        </p>
        <ul>
          <li>通常コメント → ずんだもん</li>
          <li>ギフト → 四国めたん</li>
          <li>運営コメント → 春日部つむぎ</li>
        </ul>
        <p>設定しない場合は、デフォルトのキャラクターが使用されます。</p>
      </section>

      <section>
        <h2>技術的な詳細</h2>
        <ul>
          <li>
            読み上げキューは最大 30
            件。上限を超えた場合、古いものから破棄されます。
          </li>
          <li>
            設定は <code>userData/tts-settings.json</code> に永続化されます。
          </li>
          <li>
            設定保存エラー時はスナックバーで通知し、変更はロールバックされます。
          </li>
        </ul>
      </section>
    </Layout>
  )
}
