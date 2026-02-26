import { Layout } from '../components/Layout'

export function PsdAvatarPage() {
  return (
    <Layout title="PSD アバター">
      <h1>PSD アバタープラグイン</h1>

      <section>
        <h2>概要</h2>
        <p>
          PSD ファイルを使って 2D アバターを表示するプラグインです。
          VOICEVOX でコメントを読み上げながら、音声に合わせた口パクと自動目パチを行います。
        </p>
        <ul>
          <li>PSD レイヤーを Canvas に合成して描画（z-order 完全再現）</li>
          <li>目パチアニメーション（間隔・速度を設定可能）</li>
          <li>VOICEVOX 読み上げに連動した口パク（開口・閉口アニメーション）</li>
          <li>各フレームに複数レイヤーを同時割当可能</li>
          <li>PSDTool 互換の命名規則（<code>!</code> / <code>*</code> / <code>:flipx</code> など）</li>
        </ul>

        <div className="note">
          <strong>必要なもの:</strong> VOICEVOX が起動している必要があります。{' '}
          <a href="https://voicevox.hiroshiba.jp/">公式サイト</a> からダウンロードできます。
        </div>
      </section>

      <section>
        <h2>PSD ファイルの準備</h2>
        <p>
          PSD ファイルはプラグインディレクトリの <code>models/</code>{' '}
          フォルダに配置します。レイヤー名・グループ名に特殊文字を付けることで動作を制御できます。
          これらは <a href="https://oov.github.io/psdtool/manual.html#original-feature">PSDTool の命名規則</a> と互換性があります。
        </p>

        <h3>命名規則</h3>
        <table>
          <thead>
            <tr>
              <th>記号</th>
              <th>位置</th>
              <th>対象</th>
              <th>効果</th>
              <th>例</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>!</code></td>
              <td>先頭</td>
              <td>レイヤー / グループ</td>
              <td>常に表示（設定 UI での非表示切り替え不可）</td>
              <td><code>!body</code></td>
            </tr>
            <tr>
              <td><code>*</code></td>
              <td>先頭</td>
              <td>レイヤー / グループ</td>
              <td>ラジオ選択（同一親グループ内で 1 つのみ表示）</td>
              <td><code>*outfit_a</code></td>
            </tr>
            <tr>
              <td><code>:flipx</code></td>
              <td>末尾</td>
              <td>レイヤー / グループ</td>
              <td>左右反転が有効なときのみ表示（通常版を置き換え）</td>
              <td><code>hair:flipx</code></td>
            </tr>
            <tr>
              <td><code>:flipy</code></td>
              <td>末尾</td>
              <td>レイヤー / グループ</td>
              <td>上下反転が有効なときのみ表示</td>
              <td><code>hair:flipy</code></td>
            </tr>
            <tr>
              <td><code>:flipxy</code></td>
              <td>末尾</td>
              <td>レイヤー / グループ</td>
              <td>左右・上下両方の反転が有効なときのみ表示</td>
              <td><code>hair:flipxy</code></td>
            </tr>
            <tr>
              <td>なし</td>
              <td>—</td>
              <td>レイヤー / グループ</td>
              <td>通常レイヤー（PSD の初期状態に従う）</td>
              <td><code>eye_open</code></td>
            </tr>
          </tbody>
        </table>

        <div className="note">
          <strong>:flip 系レイヤーの動作:</strong>{' '}
          例えば <code>hair</code> と <code>hair:flipx</code> を同一グループに置いた場合、
          左右反転が有効になると <code>hair</code> が非表示・<code>hair:flipx</code> が表示に自動切り替わります。
          反転設定は設定画面の「反転設定」セクションで行います。
        </div>

        <h3>目・口フレームの構成例</h3>
        <p>
          目パチと口パクはそれぞれ最大 5 フレーム（0〜4）のレイヤーを使用します。
          設定画面でレイヤーにロールを割り当てます（一部のフレームは割り当て省略可）。
          <strong>1 フレームに複数のレイヤーを同時割当することも可能です。</strong>
        </p>
        <pre>
          <code>{`avatar.psd
├── mouth_closed        ← 口: 閉じ   (frame 0)
├── mouth_half          ← 口: 半開き (frame 2)
├── mouth_open          ← 口: 開き   (frame 4)
├── eye_open            ← 目: 開き   (frame 0)  ┐ frame 0 に
├── eye_shine           ← 目: 開き   (frame 0)  ┘ 2 枚同時割当
├── eye_half            ← 目: 半開き (frame 2)
├── eye_closed          ← 目: 閉じ   (frame 4)
└── !body               ← 固定レイヤー（常時表示）`}</code>
        </pre>
        <p>
          割り当てていないフレームは最近傍補間で埋められます（例: frame 1 未割り当て → frame 0 のレイヤーを使用）。
        </p>
      </section>

      <section>
        <h2>設定画面</h2>
        <p>
          プラグイン一覧の歯車アイコンから設定画面を開きます。
          設定はリアルタイムでプレビューに反映されます。
        </p>

        <h3>レイヤーツリー</h3>
        <p>
          PSD 読み込み後にレイヤーツリーが表示されます。グループ名をクリックすると折りたたみ／展開できます。
          各レイヤーに対して以下の操作が可能です:
        </p>
        <ul>
          <li>
            <strong>表示切り替え</strong> — チェックボックス（通常）またはラジオボタン（<code>*</code> レイヤー）で表示状態を設定
          </li>
          <li>
            <strong>ロール割り当て</strong> — <code>+</code> ドロップダウンで目・口フレームのロールを追加。
            同じレイヤーに複数ロールを割り当て可能。1 フレームに複数レイヤーも割り当て可能
          </li>
          <li>
            <strong>flip バッジ</strong> — <code>:flipx</code> 等のサフィックスを持つレイヤーにはバッジが表示される
          </li>
        </ul>

        <h3>PSD ファイル</h3>
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th><th>デフォルト</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>パス</td>
              <td>プラグインディレクトリからの相対パス</td>
              <td><code>models/default.psd</code></td>
            </tr>
          </tbody>
        </table>

        <h3>VOICEVOX 設定</h3>
        <table>
          <thead>
            <tr><th>項目</th><th>範囲</th><th>デフォルト</th></tr>
          </thead>
          <tbody>
            <tr><td>API ホスト</td><td>—</td><td><code>http://localhost:50021</code></td></tr>
            <tr><td>スピーカー</td><td>—</td><td>0</td></tr>
            <tr><td>速度</td><td>0.5 〜 2.0</td><td>1.0</td></tr>
            <tr><td>音量</td><td>0 〜 2.0</td><td>1.0</td></tr>
          </tbody>
        </table>

        <h3>口パクパラメータ</h3>
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th><th>デフォルト</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>しきい値 (0〜1)</td>
              <td>音声の RMS がこの値を超えると「発話中」と判定</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>閉口遅延（フレーム数）</td>
              <td>無音が続いてから口を閉じ始めるまでの猶予フレーム数。短い無音でも口が閉じないようにする</td>
              <td>8</td>
            </tr>
            <tr>
              <td>口パク速度（遷移フレーム数）</td>
              <td>口の開口・閉口アニメーションに要するフレーム数（小さいほど速い）</td>
              <td>4</td>
            </tr>
          </tbody>
        </table>

        <div className="note">
          <strong>口パクの仕組み:</strong>{' '}
          音量しきい値で発話の ON/OFF を判定し、開始・終了時に中間フレームを使ってなめらかにアニメーションします。
          発話中は口を開いた状態を維持し、閉口中に発話が再開した場合は即座に開口アニメーションへ切り替わります。
        </div>

        <h3>目パチパラメータ</h3>
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th><th>デフォルト</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>目パチ間隔（秒）</td>
              <td>瞬きの平均間隔（±20% のジッターを加えてランダム化）</td>
              <td>3</td>
            </tr>
            <tr>
              <td>目パチ速度（遷移フレーム数）</td>
              <td>閉じる・開くそれぞれに要するフレーム数</td>
              <td>6</td>
            </tr>
          </tbody>
        </table>

        <h3>反転設定</h3>
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>左右反転</td>
              <td><code>:flipx</code> レイヤーを表示し、対応するベースレイヤーを非表示にする</td>
            </tr>
            <tr>
              <td>上下反転</td>
              <td><code>:flipy</code> レイヤーを表示し、対応するベースレイヤーを非表示にする</td>
            </tr>
          </tbody>
        </table>

        <h3>テスト発話</h3>
        <p>
          プレビュー右下のテキスト欄に文章を入力して「話す」ボタンを押すと、
          設定中の VOICEVOX パラメータで試し読み上げができます。
          「アニメーション」チェックボックスをオンにするとプレビューで目パチが動作します。
        </p>
      </section>

      <section>
        <h2>レンダリングの仕組み</h2>
        <p>
          Canvas 描画は PSD レイヤーを z-order 順に処理します。
          目・口フレームレイヤーを動的レイヤーとして扱い、
          その前後の静的レイヤー群をセグメント（オフスクリーン Canvas）にキャッシュします。
        </p>
        <pre>
          <code>{`描画順（z-order 維持）:
  segment[0]       ← 静的レイヤー群（事前合成キャッシュ）
  eye frame N      ← 現在の目フレーム（動的・複数レイヤー可）
  segment[1]       ← 目の上に重なる静的レイヤー（例: メガネ）
  mouth frame M    ← 現在の口フレーム（動的・複数レイヤー可）
  segment[2]       ← 口の上に重なる静的レイヤー`}</code>
        </pre>
        <p>
          これにより、目・口レイヤーの前後に固定レイヤーがあっても
          PSD 本来の z-order が正確に再現されます。
        </p>

        <h3>命名規則のレンダリング優先度</h3>
        <ol>
          <li><code>!</code>（forceVisible）— 他のすべてのルールより優先して常に描画</li>
          <li>祖先グループが <code>layerVisibility</code> で非表示 — 子孫を描画しない</li>
          <li><code>:flip</code> 系 — 反転状態に応じてベースレイヤーと差し替え</li>
          <li><code>*</code>（ラジオ）— 同一親グループ内で最初の 1 枚のみ描画</li>
          <li>通常 — <code>layerVisibility</code> 設定 or PSD の初期状態</li>
        </ol>
      </section>

      <section>
        <h2>OBS への設定</h2>
        <ol className="steps">
          <li>
            <strong>VOICEVOX を起動</strong>
            <br />
            VOICEVOX を起動して API サーバーが動作していることを確認します（デフォルト: <code>http://localhost:50021</code>）。
          </li>
          <li>
            <strong>OBS にブラウザソースを追加</strong>
            <br />
            URL: <code>http://localhost:3939/plugins/psd-avatar/overlay/</code>
            <br />
            幅・高さを PSD ファイルのサイズに合わせます。カスタム CSS は空で OK。
          </li>
          <li>
            <strong>設定画面で PSD とレイヤーを設定</strong>
            <br />
            NicomView の設定画面で PSD ファイルを読み込み、各フレームにレイヤーを割り当てます。
          </li>
        </ol>
      </section>
    </Layout>
  )
}
