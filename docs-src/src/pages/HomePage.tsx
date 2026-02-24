import { Layout } from '../components/Layout'
import mainWindowImg from '/img/screenshots/main-window.png'
import commentListImg from '/img/screenshots/comment-list.png'
import commentCardsImg from '/img/screenshots/comment-cards.png'

export function HomePage() {
  return (
    <Layout title="NicomView">
      <div className="hero">
        <h1>NicomView</h1>
        <p className="tagline">
          ニコニコ生放送のコメントをリアルタイムに取得し、OBS で表示するデスクトップアプリ
        </p>
        <img
          src={mainWindowImg}
          alt="NicomView メインウィンドウ"
          className="hero-screenshot"
        />
        <div className="hero-actions">
          <a
            href="https://github.com/Segu-g/nicomview/releases"
            className="btn btn-filled"
          >
            ダウンロード
          </a>
          <a href="./usage.html" className="btn btn-tonal">
            使い方を見る
          </a>
        </div>
      </div>

      <section>
        <h2>特徴</h2>
        <div className="card-grid">
          <div className="card">
            <div className="card-icon">&#127912;</div>
            <h3>プラグインシステム</h3>
            <p>
              コメントリスト・通知カードなどの表示形式をプラグインで提供。独自プラグインも追加可能。
            </p>
          </div>
          <div className="card">
            <div className="card-icon">&#128264;</div>
            <h3>読み上げ (TTS)</h3>
            <p>
              VOICEVOX・棒読みちゃんに対応。イベント別テンプレートやキャラクター切り替えも可能。
            </p>
          </div>
          <div className="card">
            <div className="card-icon">&#9889;</div>
            <h3>リアルタイム WebSocket</h3>
            <p>
              HTTP + WebSocket サーバー内蔵。OBS
              ブラウザソースや通常のブラウザでオーバーレイを表示。
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>ビルトインプラグイン</h2>
        <div className="card-grid">
          <div className="card-outlined">
            <h3>コメントリスト</h3>
            <p>リスト形式でコメントを表示。自動スクロール・200 件上限。</p>
            <img
              src={commentListImg}
              alt="コメントリスト"
              className="screenshot"
              style={{ marginTop: 16 }}
            />
          </div>
          <div className="card-outlined">
            <h3>通知カード</h3>
            <p>コメント・ギフト・通知をカード形式でスライドイン表示。</p>
            <img
              src={commentCardsImg}
              alt="通知カード"
              className="screenshot"
              style={{ marginTop: 16 }}
            />
          </div>
        </div>
      </section>

      <section>
        <h2>クイックスタート</h2>
        <ol className="steps">
          <li>
            <strong>アプリを起動</strong>
            <br />
            <a href="https://github.com/Segu-g/nicomview/releases">Releases</a>{' '}
            からダウンロードして起動します。
          </li>
          <li>
            <strong>放送に接続</strong>
            <br />
            放送 ID（例: <code>lv123456789</code>
            ）を入力して「接続」ボタンをクリック。
          </li>
          <li>
            <strong>OBS にオーバーレイを追加</strong>
            <br />
            表示されるプラグイン URL を OBS のブラウザソースに貼り付けます。詳しくは
            <a href="./usage.html">使い方</a>を参照。
          </li>
        </ol>
      </section>

      <section>
        <h2>技術スタック</h2>
        <table>
          <thead>
            <tr>
              <th>役割</th>
              <th>技術</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>デスクトップ</td>
              <td>Electron + electron-vite</td>
            </tr>
            <tr>
              <td>設定 UI</td>
              <td>React + MUI (Material Design 3)</td>
            </tr>
            <tr>
              <td>プラグイン配信</td>
              <td>Express (HTTP :3939) + ws (WebSocket :3940)</td>
            </tr>
            <tr>
              <td>コメント取得</td>
              <td>nicomget</td>
            </tr>
            <tr>
              <td>テスト</td>
              <td>Vitest + Testing Library + Playwright</td>
            </tr>
          </tbody>
        </table>
      </section>
    </Layout>
  )
}
