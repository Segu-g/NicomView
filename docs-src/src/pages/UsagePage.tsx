import { Layout } from '../components/Layout'
import mainWindowImg from '/img/screenshots/main-window.png'

export function UsagePage() {
  return (
    <Layout title="使い方">
      <h1>使い方</h1>

      <section>
        <h2>動作要件</h2>
        <ul>
          <li>Node.js &gt;= 18（開発ビルドの場合）</li>
          <li>ポート 3939, 3940 が未使用であること</li>
          <li>TTS を使う場合: VOICEVOX または棒読みちゃんが起動していること</li>
        </ul>
      </section>

      <section>
        <h2>インストール</h2>
        <h3>リリースビルドを使う場合</h3>
        <ol>
          <li>
            <a href="https://github.com/Segu-g/nicomview/releases">
              GitHub Releases
            </a>{' '}
            からお使いの OS 向けのパッケージをダウンロード
          </li>
          <li>ダウンロードしたファイルを実行してインストール</li>
        </ol>

        <h3>ソースからビルドする場合</h3>
        <pre>
          <code>{`# リポジトリをクローン
git clone https://github.com/Segu-g/nicomview.git
cd nicomview

# 依存関係のインストール
npm install

# プラグインのビルド（初回必須）
npm run build:plugins

# 開発サーバー起動
npm run dev`}</code>
        </pre>
      </section>

      <section>
        <h2>放送に接続する</h2>
        <ol className="steps">
          <li>
            <strong>アプリを起動</strong>
            <br />
            NicomView を起動すると設定ウィンドウが表示されます。
          </li>
          <li>
            <strong>放送 ID を入力</strong>
            <br />
            ニコニコ生放送の放送 ID（例: <code>lv123456789</code>
            ）を入力欄にペーストします。
          </li>
          <li>
            <strong>接続ボタンをクリック</strong>
            <br />
            「接続」ボタンを押すとコメントの取得が始まります。ステータスが「接続中」→「接続済み」に変わります。
          </li>
        </ol>
        <img src={mainWindowImg} alt="メインウィンドウ" className="screenshot" />
      </section>

      <section>
        <h2>OBS ブラウザソース設定</h2>
        <ol className="steps">
          <li>
            <strong>ブラウザソースを追加</strong>
            <br />
            OBS の「ソース」→「+」→「ブラウザ」を選択して新規作成します。
          </li>
          <li>
            <strong>URL を設定</strong>
            <br />
            NicomView に表示されるプラグイン URL をコピーして貼り付けます。
            <br />
            例:{' '}
            <code>http://localhost:3939/plugins/comment-list/overlay/</code>
          </li>
          <li>
            <strong>サイズを設定</strong>
            <br />
            幅・高さを配信解像度に合わせます（例: 1920 &times;
            1080）。カスタム CSS は空のままで OK（背景は自動で透過）。
          </li>
        </ol>

        <div className="note">
          <strong>ヒント:</strong>{' '}
          複数プラグインを同時に使用可能です。例えば、コメントリストと通知カードを別々のブラウザソースとして追加できます。
        </div>

        <h3>ビルトインプラグイン</h3>
        <table>
          <thead>
            <tr>
              <th>プラグイン</th>
              <th>URL</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>コメントリスト</td>
              <td>
                <code>
                  http://localhost:3939/plugins/comment-list/overlay/
                </code>
              </td>
              <td>リスト形式（自動スクロール・200 件上限）</td>
            </tr>
            <tr>
              <td>通知カード</td>
              <td>
                <code>
                  http://localhost:3939/plugins/comment-cards/overlay/
                </code>
              </td>
              <td>カード表示（右からスライドイン・自動退場）</td>
            </tr>
          </tbody>
        </table>
        <p>
          プラグイン一覧は <code>http://localhost:3939/</code> でも確認できます。
        </p>
      </section>

      <section>
        <h2>イベントフィルタ</h2>
        <p>表示するイベント種別を設定で選択できます:</p>
        <table>
          <thead>
            <tr>
              <th>イベント</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>コメント</td><td>通常のコメント</td></tr>
            <tr><td>ギフト</td><td>ギフト（投げ銭）イベント</td></tr>
            <tr><td>エモーション</td><td>エモーションスタンプ</td></tr>
            <tr><td>通知</td><td>システム通知</td></tr>
            <tr><td>運営コメント</td><td>運営からのコメント</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>プラグイン設定</h2>
        <p>
          各プラグインの歯車アイコンをクリックすると、プラグイン固有の設定画面が展開されます。
        </p>
        <table>
          <thead>
            <tr>
              <th>設定項目</th>
              <th>対象</th>
              <th>デフォルト</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>フォントサイズ (px)</td>
              <td>両方</td>
              <td>28</td>
              <td>コメントの文字サイズ</td>
            </tr>
            <tr>
              <td>テーマ</td>
              <td>両方</td>
              <td>ダーク</td>
              <td>
                <code>dark</code> / <code>light</code>
              </td>
            </tr>
            <tr>
              <td>表示時間 (秒)</td>
              <td>通知カードのみ</td>
              <td>60</td>
              <td>カードが自動退場するまでの時間</td>
            </tr>
          </tbody>
        </table>
        <p>
          設定値は URL パラメータとして自動反映されます（例:{' '}
          <code>?fontSize=24&amp;theme=light</code>
          ）。URL をコピーして OBS に貼れば設定済みの状態で表示されます。
        </p>
      </section>
    </Layout>
  )
}
